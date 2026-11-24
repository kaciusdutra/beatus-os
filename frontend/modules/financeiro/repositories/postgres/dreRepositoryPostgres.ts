import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type { CustoDeBaixa, PedidoParaDre } from "../../types/dre";

export interface DreRepositoryPort {
  listarPedidos(de: Date, ate: Date): Promise<PedidoParaDre[]>;

  listarBaixasDeVenda(de: Date, ate: Date): Promise<CustoDeBaixa[]>;

  impostoPercentual(): Promise<number>;
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function criarDreRepositoryPostgres(contexto: EmpresaContext): DreRepositoryPort {
  const empresaId = contexto.empresaId;

  return {
    async listarPedidos(de, ate) {
      const pedidos = await prisma.pedido.findMany({
        where: { empresaId, criadoEm: { gte: de, lt: ate } },
        select: {
          canal: true,
          statusOperacional: true,
          subtotal: true,
          descontos: true,
          taxaEntrega: true,
          total: true,
          comissaoEsperada: true,
          pagamentos: { where: { status: "APROVADO" }, select: { online: { select: { taxaGateway: true } } } },
        },
      });

      return pedidos.map((pedido) => {
        const online = pedido.pagamentos.filter((pagamento) => pagamento.online);

        const completo = online.length > 0 && online.every((pagamento) => pagamento.online?.taxaGateway !== null && pagamento.online?.taxaGateway !== undefined);

        return {
          canal: pedido.canal,
          status: pedido.statusOperacional,
          subtotal: Number(pedido.subtotal),
          descontos: Number(pedido.descontos),
          taxaEntrega: Number(pedido.taxaEntrega),
          total: Number(pedido.total),
          comissaoEsperada: pedido.comissaoEsperada === null ? undefined : Number(pedido.comissaoEsperada),
          pagoPorGateway: online.length > 0,
          taxaDoGateway: completo ? arredondar(online.reduce((soma, pagamento) => soma + Number(pagamento.online?.taxaGateway), 0)) : undefined,
        };
      });
    },

    // Baixas de estoque por venda do período, valorizadas: pelo custo gravado na baixa; as antigas, pelo custo de hoje (insumo) ou do lote (preparação).
    async listarBaixasDeVenda(de, ate) {
      const movimentos = await prisma.movimentoEstoque.findMany({
        where: { empresaId, tipo: { in: ["BAIXA_VENDA", "ESTORNO_VENDA"] }, criadoEm: { gte: de, lt: ate } },
        select: { itemTipo: true, insumoId: true, producaoLoteId: true, quantidade: true, custoUnitario: true },
      });

      const insumoIds = [...new Set(movimentos.map((movimento) => movimento.insumoId).filter((id): id is string => Boolean(id)))];

      const loteIds = [...new Set(movimentos.map((movimento) => movimento.producaoLoteId).filter((id): id is string => Boolean(id)))];

      const [insumos, lotes] = await Promise.all([
        insumoIds.length > 0 ? prisma.insumo.findMany({ where: { empresaId, id: { in: insumoIds } }, select: { id: true, custoUnitario: true } }) : [],
        loteIds.length > 0 ? prisma.producaoLote.findMany({ where: { empresaId, id: { in: loteIds } }, select: { id: true, custoUnitario: true } }) : [],
      ]);

      const custoDoInsumo = new Map(insumos.map((insumo) => [insumo.id, Number(insumo.custoUnitario)]));

      const custoDoLote = new Map(lotes.filter((lote) => lote.custoUnitario !== null).map((lote) => [lote.id, Number(lote.custoUnitario)]));

      return movimentos.map((movimento) => {
        // Custo gravado na própria baixa (a partir de 24/11/2026): exato. Sem ele, o custo de hoje (estimativa).
        if (movimento.custoUnitario !== null) {
          return { valor: arredondar(-Number(movimento.quantidade) * Number(movimento.custoUnitario)), exato: true };
        }

        const custo = movimento.itemTipo === "INSUMO" ? custoDoInsumo.get(movimento.insumoId ?? "") : custoDoLote.get(movimento.producaoLoteId ?? "");

        // A baixa grava a quantidade negativa e a devolução, positiva: o custo é o oposto da quantidade.
        return { valor: custo === undefined ? null : arredondar(-Number(movimento.quantidade) * custo) };
      });
    },

    async impostoPercentual() {
      const linha = await prisma.configuracaoPrecificacao.findUnique({ where: { empresaId }, select: { impostoPercentual: true } });

      return linha ? Number(linha.impostoPercentual) : 0;
    },
  };
}
