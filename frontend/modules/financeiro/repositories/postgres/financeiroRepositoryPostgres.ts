import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import type { FinanceiroRepositoryPort } from "../financeiroRepositoryPort";

import type {
  CompraPaga,
  LancamentoManual,
  NovoLancamento,
  PagamentoRecebido,
} from "../../types/fluxoDeCaixa";

function mapearLancamento(linha: {
  id: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: unknown;
  data: Date;
  forma: string | null;
  observacao: string | null;
  cancelado: boolean;
  motivoCancelamento: string | null;
}): LancamentoManual {
  return {
    id: linha.id,
    tipo: linha.tipo === "ENTRADA" ? "ENTRADA" : "SAIDA",
    categoria: linha.categoria,
    descricao: linha.descricao,
    valor: Number(linha.valor),
    data: linha.data.toISOString(),
    forma: linha.forma ?? undefined,
    observacao: linha.observacao ?? undefined,
    cancelado: linha.cancelado,
    motivoCancelamento: linha.motivoCancelamento ?? undefined,
  };
}

function moeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export class FinanceiroRepositoryPostgres implements FinanceiroRepositoryPort {
  constructor(private readonly contexto: EmpresaContext) {}

  async listarPagamentosRecebidos(
    de: Date,
    ate: Date
  ): Promise<PagamentoRecebido[]> {
    const pagamentos = await prisma.pagamento.findMany({
      where: {
        status: "APROVADO",
        pedido: {
          empresaId: this.contexto.empresaId,
          statusOperacional: { not: "CANCELADO" },
        },
        OR: [
          { aprovadoEm: { gte: de, lt: ate } },
          { aprovadoEm: null, criadoEm: { gte: de, lt: ate } },
        ],
      },
      include: { pedido: { select: { id: true, numero: true, canal: true } } },
      orderBy: { criadoEm: "desc" },
    });

    return pagamentos.map((pagamento) => ({
      id: pagamento.id,
      pedidoId: pagamento.pedido.id,
      numero: pagamento.pedido.numero,
      canal: pagamento.pedido.canal,
      forma: pagamento.forma,
      valor: Number(pagamento.valor),
      data: (pagamento.aprovadoEm ?? pagamento.criadoEm).toISOString(),
    }));
  }

  async listarComprasPagas(de: Date, ate: Date): Promise<CompraPaga[]> {
    const compras = await prisma.entradaCompra.findMany({
      where: {
        empresaId: this.contexto.empresaId,
        status: "CONFIRMADA",
        OR: [
          { pagoEm: { gte: de, lt: ate } },
          { pagoEm: null, dataEntrada: { gte: de, lt: ate } },
        ],
      },
      include: {
        fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
        itens: { select: { destino: true, valorTotal: true } },
      },
      orderBy: { dataEntrada: "desc" },
    });

    return compras.map((compra) => {
      const porDestino = new Map<string, number>();

      for (const item of compra.itens) {
        const destino = item.destino ?? "SEM_DESTINO";

        porDestino.set(destino, (porDestino.get(destino) ?? 0) + Number(item.valorTotal));
      }

      return {
        id: compra.id,
        numeroDocumento: compra.numeroDocumento ?? undefined,
        fornecedor: compra.fornecedor.nomeFantasia || compra.fornecedor.razaoSocial,
        valorTotal: Number(compra.valorTotal),
        forma: compra.formaPagamento ?? undefined,
        data: (compra.pagoEm ?? compra.dataEntrada).toISOString(),
        itensPorDestino: [...porDestino.entries()].map(([destino, valor]) => ({
          destino,
          valor,
        })),
      };
    });
  }

  async listarLancamentos(de: Date, ate: Date): Promise<LancamentoManual[]> {
    const linhas = await prisma.lancamentoFinanceiro.findMany({
      where: {
        empresaId: this.contexto.empresaId,
        data: { gte: de, lt: ate },
      },
      orderBy: { data: "desc" },
    });

    return linhas.map(mapearLancamento);
  }

  async criarLancamento(
    dados: NovoLancamento,
    operador?: string | null
  ): Promise<LancamentoManual> {
    return prisma.$transaction(async (tx) => {
      const criado = await tx.lancamentoFinanceiro.create({
        data: {
          empresaId: this.contexto.empresaId,
          tipo: dados.tipo,
          categoria: dados.categoria,
          descricao: dados.descricao,
          valor: dados.valor,
          data: new Date(dados.data),
          forma: dados.forma ?? null,
          observacao: dados.observacao ?? null,
        },
      });

      await registrarAtividade(tx, {
        entidade: "FINANCEIRO",
        acao: "LANCAMENTO",
        resumo: `${dados.tipo === "ENTRADA" ? "Receita" : "Despesa"} avulsa lançada: ${dados.descricao} (${dados.categoria}), ${moeda(dados.valor)}.`,
        referenciaId: criado.id,
        operador,
      });

      return mapearLancamento(criado);
    });
  }

  async cancelarLancamento(
    id: string,
    motivo: string,
    operador?: string | null
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existente = await tx.lancamentoFinanceiro.findFirst({
        where: { id, empresaId: this.contexto.empresaId },
      });

      if (!existente) {
        throw new Error("Lançamento não encontrado.");
      }

      if (existente.cancelado) {
        throw new Error("Este lançamento já está cancelado.");
      }

      await tx.lancamentoFinanceiro.update({
        where: { id },
        data: { cancelado: true, motivoCancelamento: motivo },
      });

      await registrarAtividade(tx, {
        entidade: "FINANCEIRO",
        acao: "LANCAMENTO_CANCELADO",
        resumo: `Lançamento cancelado: ${existente.descricao} (${moeda(Number(existente.valor))}). Motivo: ${motivo}`,
        referenciaId: id,
        operador,
      });
    });
  }
}

export function criarFinanceiroRepositoryPostgres(
  contexto: EmpresaContext
): FinanceiroRepositoryPort {
  return new FinanceiroRepositoryPostgres(contexto);
}
