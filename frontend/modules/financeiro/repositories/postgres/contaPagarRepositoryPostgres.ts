import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import type {
  ContaPagarRepositoryPort,
  FiltroDeTitulos,
} from "../contaPagarRepositoryPort";

import type {
  ConfiguracaoFinanceira,
  ContaPagar,
  NovoTitulo,
  PagamentoDeTitulo,
  TipoDeTitulo,
} from "../../types/contasAPagar";

// Datas de vencimento e pagamento guardadas ao meio-dia local; lidas de volta
// pelos campos locais, para o dia nunca virar por fuso.
function aData(texto: string): Date {
  return new Date(`${texto}T12:00:00`);
}

function textoDaData(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const dia = String(data.getDate()).padStart(2, "0");

  return `${data.getFullYear()}-${mes}-${dia}`;
}

function moeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

type LinhaComFornecedor = {
  id: string;
  entradaCompraId: string | null;
  fornecedorId: string;
  tipo: string;
  numeroDocumento: string | null;
  parcela: number;
  totalParcelas: number;
  valor: unknown;
  vencimento: Date;
  status: string;
  pagoEm: Date | null;
  valorPago: unknown;
  formaPagamento: string | null;
  observacao: string | null;
  motivoCancelamento: string | null;
  criadoEm: Date;
  fornecedor: { razaoSocial: string; nomeFantasia: string | null };
};

function mapear(linha: LinhaComFornecedor): ContaPagar {
  return {
    id: linha.id,
    entradaCompraId: linha.entradaCompraId ?? undefined,
    fornecedorId: linha.fornecedorId,
    fornecedor: linha.fornecedor.nomeFantasia || linha.fornecedor.razaoSocial,
    tipo: (linha.tipo as TipoDeTitulo) ?? "OUTRO",
    numeroDocumento: linha.numeroDocumento ?? undefined,
    parcela: linha.parcela,
    totalParcelas: linha.totalParcelas,
    valor: Number(linha.valor),
    vencimento: textoDaData(linha.vencimento),
    status: linha.status === "PAGO" ? "PAGO" : linha.status === "CANCELADO" ? "CANCELADO" : "ABERTO",
    pagoEm: linha.pagoEm ? textoDaData(linha.pagoEm) : undefined,
    valorPago: linha.valorPago === null ? undefined : Number(linha.valorPago),
    formaPagamento: linha.formaPagamento ?? undefined,
    observacao: linha.observacao ?? undefined,
    motivoCancelamento: linha.motivoCancelamento ?? undefined,
    criadoEm: linha.criadoEm.toISOString(),
  };
}

const INCLUIR_FORNECEDOR = {
  fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
} as const;

export class ContaPagarRepositoryPostgres implements ContaPagarRepositoryPort {
  constructor(private readonly contexto: EmpresaContext) {}

  async criarTitulos(
    origem: { entradaCompraId?: string; fornecedorId: string },
    titulos: NovoTitulo[],
    operador?: string | null
  ): Promise<ContaPagar[]> {
    return prisma.$transaction(async (tx) => {
      const criados: ContaPagar[] = [];

      for (const [indice, titulo] of titulos.entries()) {
        const linha = await tx.contaPagar.create({
          data: {
            empresaId: this.contexto.empresaId,
            entradaCompraId: origem.entradaCompraId ?? null,
            fornecedorId: origem.fornecedorId,
            tipo: titulo.tipo,
            numeroDocumento: titulo.numeroDocumento ?? null,
            parcela: indice + 1,
            totalParcelas: titulos.length,
            valor: titulo.valor,
            vencimento: aData(titulo.vencimento),
            observacao: titulo.observacao ?? null,
          },
          include: INCLUIR_FORNECEDOR,
        });

        criados.push(mapear(linha));
      }

      const total = criados.reduce((soma, titulo) => soma + titulo.valor, 0);

      await registrarAtividade(tx, {
        entidade: "FINANCEIRO",
        acao: "TITULOS_CRIADOS",
        resumo: `${criados.length} título(s) a pagar a ${criados[0]?.fornecedor ?? "fornecedor"}, total ${moeda(total)}; primeiro vencimento em ${criados[0]?.vencimento}.`,
        referenciaId: origem.entradaCompraId,
        operador,
      });

      return criados;
    });
  }

  async listar(filtro: FiltroDeTitulos = {}): Promise<ContaPagar[]> {
    const linhas = await prisma.contaPagar.findMany({
      where: {
        empresaId: this.contexto.empresaId,
        ...(filtro.status ? { status: filtro.status } : {}),
        ...(filtro.vencimentoDe || filtro.vencimentoAte
          ? {
              vencimento: {
                ...(filtro.vencimentoDe ? { gte: aData(filtro.vencimentoDe) } : {}),
                ...(filtro.vencimentoAte ? { lte: aData(filtro.vencimentoAte) } : {}),
              },
            }
          : {}),
      },
      include: INCLUIR_FORNECEDOR,
      orderBy: [{ vencimento: "asc" }, { parcela: "asc" }],
    });

    return linhas.map(mapear);
  }

  async pagar(
    id: string,
    pagamento: PagamentoDeTitulo,
    operador?: string | null
  ): Promise<ContaPagar> {
    return prisma.$transaction(async (tx) => {
      const existente = await tx.contaPagar.findFirst({
        where: { id, empresaId: this.contexto.empresaId },
        include: INCLUIR_FORNECEDOR,
      });

      if (!existente) {
        throw new Error("Título não encontrado.");
      }

      if (existente.status !== "ABERTO") {
        throw new Error(
          existente.status === "PAGO"
            ? "Este título já foi pago."
            : "Este título está cancelado."
        );
      }

      const atualizado = await tx.contaPagar.update({
        where: { id },
        data: {
          status: "PAGO",
          pagoEm: aData(pagamento.pagoEm),
          valorPago: pagamento.valorPago,
          formaPagamento: pagamento.forma,
        },
        include: INCLUIR_FORNECEDOR,
      });

      const original = Number(existente.valor);

      const diferenca = Math.round((pagamento.valorPago - original) * 100) / 100;

      await registrarAtividade(tx, {
        entidade: "FINANCEIRO",
        acao: "TITULO_PAGO",
        resumo: `Título ${existente.parcela}/${existente.totalParcelas} de ${mapear(existente).fornecedor} pago: ${moeda(pagamento.valorPago)} em ${pagamento.pagoEm}${diferenca !== 0 ? ` (${diferenca > 0 ? "juros/multa" : "desconto"} de ${moeda(Math.abs(diferenca))} sobre ${moeda(original)})` : ""}.`,
        referenciaId: id,
        operador,
      });

      return mapear(atualizado);
    });
  }

  async cancelar(id: string, motivo: string, operador?: string | null): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existente = await tx.contaPagar.findFirst({
        where: { id, empresaId: this.contexto.empresaId },
      });

      if (!existente) {
        throw new Error("Título não encontrado.");
      }

      if (existente.status !== "ABERTO") {
        throw new Error(
          existente.status === "PAGO"
            ? "Título já pago não pode ser cancelado."
            : "Este título já está cancelado."
        );
      }

      await tx.contaPagar.update({
        where: { id },
        data: { status: "CANCELADO", motivoCancelamento: motivo },
      });

      await registrarAtividade(tx, {
        entidade: "FINANCEIRO",
        acao: "TITULO_CANCELADO",
        resumo: `Título ${existente.parcela}/${existente.totalParcelas} de ${moeda(Number(existente.valor))} cancelado. Motivo: ${motivo}`,
        referenciaId: id,
        operador,
      });
    });
  }

  async cancelarDaCompra(
    entradaCompraId: string,
    motivo: string,
    operador?: string | null
  ): Promise<{ cancelados: number; pagos: number }> {
    return prisma.$transaction(async (tx) => {
      const titulos = await tx.contaPagar.findMany({
        where: { empresaId: this.contexto.empresaId, entradaCompraId },
      });

      const abertos = titulos.filter((titulo) => titulo.status === "ABERTO");

      const pagos = titulos.filter((titulo) => titulo.status === "PAGO").length;

      if (abertos.length > 0) {
        await tx.contaPagar.updateMany({
          where: { id: { in: abertos.map((titulo) => titulo.id) } },
          data: {
            status: "CANCELADO",
            motivoCancelamento: `Compra cancelada. ${motivo}`,
          },
        });

        await registrarAtividade(tx, {
          entidade: "FINANCEIRO",
          acao: "TITULO_CANCELADO",
          resumo: `${abertos.length} título(s) em aberto cancelado(s) com o cancelamento da compra${pagos > 0 ? `; ${pagos} já pago(s) permanece(m) no caixa` : ""}.`,
          referenciaId: entradaCompraId,
          operador,
        });
      }

      return { cancelados: abertos.length, pagos };
    });
  }

  async buscarConfiguracao(): Promise<ConfiguracaoFinanceira> {
    const linha = await prisma.configuracaoFinanceira.findUnique({
      where: { empresaId: this.contexto.empresaId },
    });

    return {
      saldoInicial: linha ? Number(linha.saldoInicial) : 0,
      saldoInicialEm: linha?.saldoInicialEm ? textoDaData(linha.saldoInicialEm) : undefined,
    };
  }

  async salvarConfiguracao(
    configuracao: ConfiguracaoFinanceira,
    operador?: string | null
  ): Promise<ConfiguracaoFinanceira> {
    await prisma.$transaction(async (tx) => {
      await tx.configuracaoFinanceira.upsert({
        where: { empresaId: this.contexto.empresaId },
        create: {
          empresaId: this.contexto.empresaId,
          saldoInicial: configuracao.saldoInicial,
          saldoInicialEm: configuracao.saldoInicialEm ? aData(configuracao.saldoInicialEm) : null,
        },
        update: {
          saldoInicial: configuracao.saldoInicial,
          saldoInicialEm: configuracao.saldoInicialEm ? aData(configuracao.saldoInicialEm) : null,
        },
      });

      await registrarAtividade(tx, {
        entidade: "FINANCEIRO",
        acao: "SALDO_INICIAL",
        resumo: `Saldo inicial do caixa definido em ${moeda(configuracao.saldoInicial)}${configuracao.saldoInicialEm ? `, a partir de ${configuracao.saldoInicialEm}` : ""}.`,
        operador,
      });
    });

    return this.buscarConfiguracao();
  }
}

export function criarContaPagarRepositoryPostgres(
  contexto: EmpresaContext
): ContaPagarRepositoryPort {
  return new ContaPagarRepositoryPostgres(contexto);
}
