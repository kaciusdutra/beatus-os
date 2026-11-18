import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import type { VantagemParaCalcular } from "@/modules/pedidos/services/calcularPedido";

import { estadoDoCartao } from "../../cartao";

import { CLUBE_ATIVO, DIAS_DE_VALIDADE_DA_VANTAGEM } from "../../regras";

import { descreverVantagem, type DadosDaVantagem, type TipoDeVantagem } from "../../vantagens";

// O catálogo de vantagens e o resgate (seção 28). Quem completa o cartão escolhe UMA vantagem do catálogo; a escolha
// vira um resgate (copia a vantagem na hora). O resgate é usado no checkout e consumido quando o pedido é entregue.

type Banco = Pick<Prisma.TransactionClient, "cartaoDoClube" | "resgateDoClube">;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const FORMATO_DO_CODIGO = /^[A-Za-z0-9_-]{43}$/;

function numero(valor: unknown): number | null {
  return valor === null || valor === undefined ? null : Number(valor);
}

export interface VantagemListada extends DadosDaVantagem {
  id: string;
  descricaoParaOCliente: string;
}

function listar(v: { id: string; nome: string; descricao: string | null; tipo: string; categoria: string | null; valorMaximo: unknown; percentual: unknown; ativa: boolean; ordem: number }): VantagemListada {
  const valorMaximo = numero(v.valorMaximo);

  const percentual = numero(v.percentual);

  return {
    id: v.id,
    nome: v.nome,
    descricao: v.descricao,
    tipo: v.tipo as TipoDeVantagem,
    categoria: v.categoria,
    valorMaximo,
    percentual,
    ativa: v.ativa,
    ordem: v.ordem,
    descricaoParaOCliente: descreverVantagem({ tipo: v.tipo, categoria: v.categoria, valorMaximo, percentual }),
  };
}

// ---------- Catálogo (a equipe) ----------

export async function listarVantagens(somenteAtivas = false): Promise<VantagemListada[]> {
  const empresaId = criarContextoDesenvolvimento().empresaId;

  const vantagens = await prisma.vantagemDoClube.findMany({ where: { empresaId, ...(somenteAtivas ? { ativa: true } : {}) }, orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }] });

  return vantagens.map(listar);
}

export async function salvarVantagem(dados: DadosDaVantagem, id?: string): Promise<VantagemListada> {
  const empresaId = criarContextoDesenvolvimento().empresaId;

  if (id) {
    const existente = await prisma.vantagemDoClube.findFirst({ where: { id, empresaId } });

    if (!existente) {
      throw new Error("Vantagem não encontrada.");
    }

    return listar(await prisma.vantagemDoClube.update({ where: { id }, data: dados }));
  }

  return listar(await prisma.vantagemDoClube.create({ data: { ...dados, empresaId } }));
}

// ---------- A escolha do cliente ----------

export interface ResgateDoCartao {
  id: string;
  nome: string;
  descricaoParaOCliente: string;
  status: string;
  expiraEm: Date;
}

export type ResultadoDaEscolha = { ok: true; resgate: ResgateDoCartao; jaEscolhida: boolean } | { ok: false; erro: string };

function paraResgate(r: { id: string; nome: string; tipo: string; categoria: string | null; valorMaximo: unknown; percentual: unknown; status: string; expiraEm: Date }): ResgateDoCartao {
  return {
    id: r.id,
    nome: r.nome,
    descricaoParaOCliente: descreverVantagem({ tipo: r.tipo, categoria: r.categoria, valorMaximo: numero(r.valorMaximo), percentual: numero(r.percentual) }),
    status: r.status,
    expiraEm: r.expiraEm,
  };
}

// O cliente completou o cartão e escolhe a vantagem. Só uma por ciclo (índice único no banco): escolher de novo
// devolve a já escolhida.
export async function escolherVantagem(codigo: string, vantagemId: string, ativo = CLUBE_ATIVO, agora = new Date()): Promise<ResultadoDaEscolha> {
  if (!ativo || !FORMATO_DO_CODIGO.test(codigo)) {
    return { ok: false, erro: "Cartão não encontrado." };
  }

  const cartao = await prisma.cartaoDoClube.findUnique({ where: { codigo } });

  if (!cartao) {
    return { ok: false, erro: "Cartão não encontrado." };
  }

  const selosNoCiclo = await prisma.seloDoClube.count({ where: { cartaoId: cartao.id, ciclo: cartao.ciclo } });

  const estado = estadoDoCartao({ cicloIniciadoEm: cartao.cicloIniciadoEm, ultimoPedidoEm: cartao.ultimoPedidoEm, completoEm: cartao.completoEm, selosNoCiclo }, agora);

  if (estado.venceu) {
    return { ok: false, erro: "Seu cartão venceu e recomeçou. Faça um novo pedido para ganhar o primeiro selo." };
  }

  if (!estado.completo || !cartao.completoEm) {
    return { ok: false, erro: "Seu cartão ainda não está completo." };
  }

  const existente = await prisma.resgateDoClube.findUnique({ where: { cartaoId_ciclo: { cartaoId: cartao.id, ciclo: cartao.ciclo } } });

  if (existente) {
    return { ok: true, resgate: paraResgate(existente), jaEscolhida: true };
  }

  const vantagem = await prisma.vantagemDoClube.findFirst({ where: { id: vantagemId, empresaId: cartao.empresaId, ativa: true } });

  if (!vantagem) {
    return { ok: false, erro: "Essa vantagem não está disponível." };
  }

  try {
    const criado = await prisma.resgateDoClube.create({
      data: {
        empresaId: cartao.empresaId,
        cartaoId: cartao.id,
        vantagemId: vantagem.id,
        ciclo: cartao.ciclo,
        nome: vantagem.nome,
        tipo: vantagem.tipo,
        categoria: vantagem.categoria,
        valorMaximo: vantagem.valorMaximo,
        percentual: vantagem.percentual,
        expiraEm: new Date(cartao.completoEm.getTime() + DIAS_DE_VALIDADE_DA_VANTAGEM * MS_POR_DIA),
      },
    });

    return { ok: true, resgate: paraResgate(criado), jaEscolhida: false };
  } catch (error) {
    // Dois toques ao mesmo tempo: o outro escolheu primeiro.
    const depois = await prisma.resgateDoClube.findUnique({ where: { cartaoId_ciclo: { cartaoId: cartao.id, ciclo: cartao.ciclo } } });

    if (depois) {
      return { ok: true, resgate: paraResgate(depois), jaEscolhida: true };
    }

    throw error;
  }
}

// O resgate do cartão no ciclo atual, qualquer que seja o estado (para a página do cartão).
export async function resgateDoCartao(cartaoId: string, ciclo: number): Promise<ResgateDoCartao | null> {
  const resgate = await prisma.resgateDoClube.findUnique({ where: { cartaoId_ciclo: { cartaoId, ciclo } } });

  return resgate ? paraResgate(resgate) : null;
}

// ---------- Uso no checkout ----------

export interface ResgateParaUsar {
  resgateId: string;
  regra: VantagemParaCalcular;
}

// A vantagem que este cartão pode usar agora (escolhida, ainda não usada e no prazo), para o checkout abater no pedido.
export async function resgateParaUsar(codigo: string, ativo = CLUBE_ATIVO, agora = new Date()): Promise<ResgateParaUsar | null> {
  if (!ativo || !FORMATO_DO_CODIGO.test(codigo)) {
    return null;
  }

  const cartao = await prisma.cartaoDoClube.findUnique({ where: { codigo } });

  if (!cartao) {
    return null;
  }

  const resgate = await prisma.resgateDoClube.findUnique({ where: { cartaoId_ciclo: { cartaoId: cartao.id, ciclo: cartao.ciclo } } });

  if (!resgate || resgate.status !== "ATIVO" || resgate.expiraEm.getTime() <= agora.getTime()) {
    return null;
  }

  return {
    resgateId: resgate.id,
    regra: { tipo: resgate.tipo as TipoDeVantagem, nome: resgate.nome, categoria: resgate.categoria, valorMaximo: numero(resgate.valorMaximo), percentual: numero(resgate.percentual) },
  };
}

// O pedido foi criado com a vantagem: o resgate passa a ser deste pedido. Devolve falso se já estava em outro pedido
// (duas compras ao mesmo tempo): quem chama registra o aviso, o pedido segue com o valor que o cliente pagou.
export async function reservarResgateParaPedido(db: Banco, resgateId: string, pedidoId: string, valorDoPremio: number): Promise<boolean> {
  const { count } = await db.resgateDoClube.updateMany({ where: { id: resgateId, status: "ATIVO" }, data: { status: "EM_PEDIDO", pedidoId, valorDoPremio } });

  return count === 1;
}

// ---------- Fim do resgate ----------

// O pedido com a vantagem foi entregue: o resgate vira usado e o cartão reinicia (o selo deste pedido já conta no ciclo novo).
export async function consumirResgateDoPedido(pedidoId: string, agora = new Date()): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const resgate = await tx.resgateDoClube.findFirst({ where: { pedidoId, status: "EM_PEDIDO" } });

    if (!resgate) {
      return false;
    }

    await tx.resgateDoClube.update({ where: { id: resgate.id }, data: { status: "USADO", usadoEm: agora } });

    await tx.cartaoDoClube.update({ where: { id: resgate.cartaoId }, data: { ciclo: { increment: 1 }, cicloIniciadoEm: agora, completoEm: null, ultimoPedidoEm: null } });

    return true;
  });
}

// O pedido com a vantagem foi cancelado: a vantagem volta, se ainda estiver no prazo.
export async function liberarResgateDoPedido(pedidoId: string, agora = new Date()): Promise<"LIBERADO" | "EXPIRADO" | "NENHUM"> {
  const resgate = await prisma.resgateDoClube.findFirst({ where: { pedidoId, status: "EM_PEDIDO" } });

  if (!resgate) {
    return "NENHUM";
  }

  const noPrazo = resgate.expiraEm.getTime() > agora.getTime();

  await prisma.resgateDoClube.update({ where: { id: resgate.id }, data: noPrazo ? { status: "ATIVO", pedidoId: null, valorDoPremio: null } : { status: "EXPIRADO" } });

  return noPrazo ? "LIBERADO" : "EXPIRADO";
}
