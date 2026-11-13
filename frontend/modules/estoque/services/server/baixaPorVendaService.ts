import "server-only";

import { prisma } from "@/lib/prisma";

import type { Prisma } from "@/lib/generated/prisma/client";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { consumoDaFicha, type ConsumoDeEstoque } from "../calcularConsumo";

import { alocarNaCozinha } from "../alocarNaCozinha";

import { getEstoqueService } from "./estoqueService";

type Transacao = Prisma.TransactionClient;

function arredondar(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}

export interface ItemParaBaixa {
  produtoId: string | null;

  nome: string;

  quantidade: number;
}

// Baixa o estoque pelo que um pedido consome, pela ficha de cada produto.
// Insumos saem do saldo; preparações saem da coluna "Na cozinha", primeiro a
// vencer, primeiro a sair. Roda uma vez só por pedido.
export async function baixarPedido(
  tx: Transacao,
  pedido: { id: string; numero: string; itens: ItemParaBaixa[] }
): Promise<{ avisos: string[]; baixado: boolean }> {
  const empresaId = criarContextoDesenvolvimento().empresaId;

  const jaBaixado = await tx.movimentoEstoque.count({
    where: { empresaId, pedidoId: pedido.id, tipo: "BAIXA_VENDA" },
  });

  if (jaBaixado > 0) {
    return { avisos: [], baixado: false };
  }

  const { contexto, fichas } = await getEstoqueService().carregarContexto();

  const avisos: string[] = [];

  const consumos = new Map<string, ConsumoDeEstoque>();

  for (const item of pedido.itens) {
    const ficha = item.produtoId
      ? fichas.find(
          (candidata) =>
            candidata.tipo === "PRODUTO" &&
            candidata.ativo &&
            candidata.produtoId === item.produtoId
        )
      : undefined;

    if (!ficha) {
      avisos.push(`${item.nome}: sem ficha técnica ativa, não baixou o estoque.`);

      continue;
    }

    const resultado = consumoDaFicha(ficha, item.quantidade, contexto);

    avisos.push(...resultado.avisos.map((aviso) => `${item.nome}: ${aviso}`));

    for (const consumo of resultado.consumos) {
      const chave = `${consumo.itemTipo}:${consumo.id}`;

      const atual = consumos.get(chave);

      if (atual) {
        atual.quantidade = arredondar(atual.quantidade + consumo.quantidade);
      } else {
        consumos.set(chave, { ...consumo });
      }
    }
  }

  const motivo = `Pedido #${pedido.numero}`;

  for (const consumo of consumos.values()) {
    if (consumo.itemTipo === "INSUMO") {
      await tx.movimentoEstoque.create({
        data: {
          empresaId,
          itemTipo: "INSUMO",
          insumoId: consumo.id,
          tipo: "BAIXA_VENDA",
          quantidade: arredondar(consumo.quantidade) * -1,
          unidade: consumo.unidade,
          motivo,
          pedidoId: pedido.id,
        },
      });

      continue;
    }

    // Preparação: sai dos cartões da cozinha, o que vence primeiro sai primeiro.
    const movimentos = await tx.movimentoEstoque.findMany({
      where: {
        empresaId,
        itemTipo: "PREPARACAO",
        fichaTecnicaId: consumo.id,
        local: "COZINHA",
      },
    });

    const grupos = new Map<
      string,
      {
        producaoLoteId?: string;
        gavetaId?: string;
        quantidade: number;
        validadeAte?: string;
      }
    >();

    for (const movimento of movimentos) {
      const chave = `${movimento.producaoLoteId ?? "-"}|${movimento.gavetaId ?? "-"}`;

      const grupo = grupos.get(chave) ?? {
        producaoLoteId: movimento.producaoLoteId ?? undefined,
        gavetaId: movimento.gavetaId ?? undefined,
        quantidade: 0,
        validadeAte: undefined,
      };

      grupo.quantidade += Number(movimento.quantidade);

      if (
        Number(movimento.quantidade) > 0 &&
        movimento.validadeAte &&
        (!grupo.validadeAte ||
          movimento.validadeAte.toISOString() < grupo.validadeAte)
      ) {
        grupo.validadeAte = movimento.validadeAte.toISOString();
      }

      grupos.set(chave, grupo);
    }

    const { alocacoes, faltante } = alocarNaCozinha(
      [...grupos.values()],
      consumo.quantidade
    );

    for (const alocacao of alocacoes) {
      await tx.movimentoEstoque.create({
        data: {
          empresaId,
          itemTipo: "PREPARACAO",
          fichaTecnicaId: consumo.id,
          tipo: "BAIXA_VENDA",
          quantidade: alocacao.quantidade * -1,
          unidade: consumo.unidade,
          motivo,
          pedidoId: pedido.id,
          producaoLoteId: alocacao.producaoLoteId ?? null,
          gavetaId: alocacao.gavetaId ?? null,
          local: "COZINHA",
        },
      });
    }

    if (faltante > 0) {
      await tx.movimentoEstoque.create({
        data: {
          empresaId,
          itemTipo: "PREPARACAO",
          fichaTecnicaId: consumo.id,
          tipo: "BAIXA_VENDA",
          quantidade: arredondar(faltante) * -1,
          unidade: consumo.unidade,
          motivo: `${motivo} (a cozinha não tinha tudo)`,
          pedidoId: pedido.id,
        },
      });

      avisos.push(
        `${consumo.nome}: faltaram ${arredondar(faltante)} ${consumo.unidade} na cozinha; a baixa saiu do saldo geral. Leve a gaveta para a cozinha no quadro.`
      );
    }
  }

  return { avisos, baixado: true };
}

export interface ConsumoDoPedido {
  itemTipo: "INSUMO" | "PREPARACAO";

  id: string;

  nome: string;

  unidade: string;

  // O que o pedido tirou do estoque, menos o que já voltou.
  quantidade: number;
}

// O que um pedido consumiu (para a tela de cancelamento).
export async function consumoDoPedido(
  pedidoId: string
): Promise<ConsumoDoPedido[]> {
  const empresaId = criarContextoDesenvolvimento().empresaId;

  const movimentos = await prisma.movimentoEstoque.findMany({
    where: {
      empresaId,
      pedidoId,
      tipo: { in: ["BAIXA_VENDA", "ESTORNO_VENDA"] },
    },
    include: { insumo: true, fichaTecnica: true },
  });

  const porItem = new Map<string, ConsumoDoPedido>();

  for (const movimento of movimentos) {
    const chave = `${movimento.itemTipo}:${movimento.insumoId ?? movimento.fichaTecnicaId}`;

    const atual = porItem.get(chave) ?? {
      itemTipo: movimento.itemTipo as "INSUMO" | "PREPARACAO",
      id: (movimento.insumoId ?? movimento.fichaTecnicaId) as string,
      nome: movimento.insumo?.nome ?? movimento.fichaTecnica?.nome ?? "Item",
      unidade: movimento.unidade,
      quantidade: 0,
    };

    atual.quantidade = arredondar(atual.quantidade - Number(movimento.quantidade));

    porItem.set(chave, atual);
  }

  return [...porItem.values()].filter((item) => item.quantidade > 0.00005);
}

// O que a cozinha marcou como aproveitável volta ao estoque (só insumos:
// preparação já manipulada não volta).
export async function devolverAoEstoque(
  tx: Transacao,
  pedido: { id: string; numero: string },
  devolucoes: { id: string; quantidade: number }[]
): Promise<string[]> {
  const empresaId = criarContextoDesenvolvimento().empresaId;

  const movimentos = await tx.movimentoEstoque.findMany({
    where: {
      empresaId,
      pedidoId: pedido.id,
      itemTipo: "INSUMO",
      tipo: { in: ["BAIXA_VENDA", "ESTORNO_VENDA"] },
    },
    include: { insumo: true },
  });

  const resumos: string[] = [];

  for (const devolucao of devolucoes) {
    if (!Number.isFinite(devolucao.quantidade) || devolucao.quantidade <= 0) {
      continue;
    }

    const doItem = movimentos.filter((m) => m.insumoId === devolucao.id);

    const disponivel = arredondar(
      doItem.reduce((soma, m) => soma - Number(m.quantidade), 0)
    );

    if (devolucao.quantidade > disponivel + 0.00005) {
      throw new Error(
        `Só dá para devolver ${disponivel} de ${doItem[0]?.insumo?.nome ?? "este item"}.`
      );
    }

    await tx.movimentoEstoque.create({
      data: {
        empresaId,
        itemTipo: "INSUMO",
        insumoId: devolucao.id,
        tipo: "ESTORNO_VENDA",
        quantidade: arredondar(devolucao.quantidade),
        unidade: doItem[0]?.unidade ?? "",
        motivo: `Pedido #${pedido.numero} cancelado: aproveitado`,
        pedidoId: pedido.id,
      },
    });

    resumos.push(
      `${arredondar(devolucao.quantidade)} ${doItem[0]?.unidade ?? ""} de ${doItem[0]?.insumo?.nome ?? "item"}`
    );
  }

  return resumos;
}
