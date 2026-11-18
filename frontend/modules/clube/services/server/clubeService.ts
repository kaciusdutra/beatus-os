import "server-only";

import { randomBytes } from "node:crypto";

import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { decidirSelo, estadoDoCartao, primeiroNome, type DecisaoDoSelo, type EstadoDoCartao } from "../../cartao";

import { CLUBE_ATIVO } from "../../regras";

// O cartão do clube no banco (seção 28 das regras). Tudo recebe o cliente do banco (`db`) de quem chama, para rodar
// na MESMA transação da entrega do pedido: não existe o selo sem a entrega, nem a entrega marcada sem o selo.
// Enquanto CLUBE_ATIVO for falso, nada aqui cria cartão nem selo.

type Banco = Pick<Prisma.TransactionClient, "cartaoDoClube" | "seloDoClube" | "cliente" | "pedido">;

const CANAIS_PROPRIOS = ["PDV", "WHATSAPP", "CARDAPIO_ONLINE"];

// Código longo e aleatório do link do cartão (43 caracteres, 256 bits): o endereço é o segredo.
export function novoCodigoDoCartao(): string {
  return randomBytes(32).toString("base64url");
}

export function canalConta(canal: string, codigoExterno?: string | null): boolean {
  return !codigoExterno && CANAIS_PROPRIOS.includes(canal);
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// Aciona o cartão do cliente (se ainda não existe). Quem chama já conferiu o aceite e o pagamento.
export async function ativarCartao(db: Banco, dados: { empresaId: string; clienteId: string; ativadoEm: Date }, ativo = CLUBE_ATIVO): Promise<{ criado: boolean; codigo?: string }> {
  if (!ativo) {
    return { criado: false };
  }

  const chave = { empresaId_clienteId: { empresaId: dados.empresaId, clienteId: dados.clienteId } };

  const existente = await db.cartaoDoClube.findUnique({ where: chave });

  if (existente) {
    return { criado: false, codigo: existente.codigo };
  }

  try {
    const criado = await db.cartaoDoClube.create({
      data: { empresaId: dados.empresaId, clienteId: dados.clienteId, codigo: novoCodigoDoCartao(), ativadoEm: dados.ativadoEm, cicloIniciadoEm: dados.ativadoEm },
    });

    return { criado: true, codigo: criado.codigo };
  } catch (error) {
    // Dois pedidos ao mesmo tempo: o outro acionou primeiro (índice único empresa + cliente).
    const depois = await db.cartaoDoClube.findUnique({ where: chave });

    if (depois) {
      return { criado: false, codigo: depois.codigo };
    }

    throw error;
  }
}

// Depois do pagamento aprovado: se o cliente aceitou o clube e o pedido é de canal próprio, aciona o cartão (regra 28.11).
export async function ativarCartaoDoPedido(pedidoId: string, ativo = CLUBE_ATIVO): Promise<{ criado: boolean; codigo?: string }> {
  if (!ativo) {
    return { criado: false };
  }

  const empresaId = criarContextoDesenvolvimento().empresaId;

  const pedido = await prisma.pedido.findFirst({ where: { id: pedidoId, empresaId }, select: { clienteId: true, canal: true, codigoExterno: true, criadoEm: true, cliente: { select: { aceitaMarketing: true, ativo: true } } } });

  if (!pedido || !pedido.cliente.aceitaMarketing || !pedido.cliente.ativo || !canalConta(pedido.canal, pedido.codigoExterno)) {
    return { criado: false };
  }

  return ativarCartao(prisma, { empresaId, clienteId: pedido.clienteId, ativadoEm: pedido.criadoEm }, ativo);
}

export interface PedidoEntregue {
  id: string;
  empresaId: string;
  clienteId: string;
  canal: string;
  codigoExterno?: string | null;
  criadoEm: Date;
  subtotal: unknown;
  descontos: unknown;
}

// O pedido virou "Entregue": credita o selo, se for o caso (regras 28.2 a 28.4). Devolve a decisão, para o registro.
export async function creditarSeloDaEntrega(db: Banco, pedido: PedidoEntregue, opcoes: { ativo?: boolean; agora?: Date } = {}): Promise<DecisaoDoSelo> {
  const ativo = opcoes.ativo ?? CLUBE_ATIVO;

  const agora = opcoes.agora ?? new Date();

  const valorDosItens = arredondar(Number(pedido.subtotal) - Number(pedido.descontos));

  const canalProprio = canalConta(pedido.canal, pedido.codigoExterno);

  // Desligado ou fora dos canais próprios: nem consulta o banco.
  if (!ativo || !canalProprio) {
    return decidirSelo({ ativo, canalProprio, clienteAceita: false, cartao: null, pedido: { criadoEm: pedido.criadoEm, valorDosItens }, agora });
  }

  const cartao = await db.cartaoDoClube.findUnique({ where: { empresaId_clienteId: { empresaId: pedido.empresaId, clienteId: pedido.clienteId } } });

  const cliente = await db.cliente.findUnique({ where: { id: pedido.clienteId }, select: { aceitaMarketing: true } });

  const selosNoCiclo = cartao ? await db.seloDoClube.count({ where: { cartaoId: cartao.id, ciclo: cartao.ciclo } }) : 0;

  const decisao = decidirSelo({
    ativo,
    canalProprio,
    clienteAceita: cliente?.aceitaMarketing === true,
    cartao: cartao ? { ativadoEm: cartao.ativadoEm, ciclo: cartao.ciclo, cicloIniciadoEm: cartao.cicloIniciadoEm, ultimoPedidoEm: cartao.ultimoPedidoEm, completoEm: cartao.completoEm, selosNoCiclo } : null,
    pedido: { criadoEm: pedido.criadoEm, valorDosItens },
    agora,
  });

  if (!cartao || (!decisao.creditar && !decisao.reiniciar && !decisao.atualizarUltimoPedido)) {
    return decisao;
  }

  let completou = false;

  let jaCreditado = false;

  if (decisao.creditar) {
    // O índice único em pedidoId garante um selo só por pedido, mesmo que isto rode duas vezes.
    const { count } = await db.seloDoClube.createMany({
      data: [{ empresaId: pedido.empresaId, cartaoId: cartao.id, pedidoId: pedido.id, ciclo: decisao.ciclo, valorDosItens }],
      skipDuplicates: true,
    });

    completou = count === 1 && decisao.completa;

    jaCreditado = count === 0;
  }

  await db.cartaoDoClube.update({
    where: { id: cartao.id },
    data: {
      ...(decisao.reiniciar ? { ciclo: decisao.ciclo, cicloIniciadoEm: agora, completoEm: null } : {}),
      ...(completou ? { completoEm: agora } : {}),
      ...(decisao.atualizarUltimoPedido ? { ultimoPedidoEm: agora } : {}),
    },
  });

  // O selo deste pedido já existia: nada mudou, e quem chama não deve registrar um crédito novo.
  return jaCreditado ? { ...decisao, creditar: false, motivo: "JA_CREDITADO", completa: false } : decisao;
}

export interface CartaoParaMostrar {
  primeiroNome: string;
  estado: EstadoDoCartao;
}

// O cartão que a página mostra, pelo código do link. Nulo se não existe (ou se o clube está desligado).
export async function cartaoPorCodigo(codigo: string, ativo = CLUBE_ATIVO, agora = new Date()): Promise<CartaoParaMostrar | null> {
  // O código tem 43 caracteres: quem manda outra coisa não precisa nem chegar ao banco.
  if (!ativo || !/^[A-Za-z0-9_-]{43}$/.test(codigo)) {
    return null;
  }

  const cartao = await prisma.cartaoDoClube.findUnique({ where: { codigo }, include: { cliente: { select: { nome: true } } } });

  if (!cartao) {
    return null;
  }

  const selosNoCiclo = await prisma.seloDoClube.count({ where: { cartaoId: cartao.id, ciclo: cartao.ciclo } });

  return {
    primeiroNome: primeiroNome(cartao.cliente.nome),
    estado: estadoDoCartao({ cicloIniciadoEm: cartao.cicloIniciadoEm, ultimoPedidoEm: cartao.ultimoPedidoEm, completoEm: cartao.completoEm, selosNoCiclo }, agora),
  };
}
