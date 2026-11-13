import "server-only";

import { prisma } from "@/lib/prisma";
import type { EmpresaContext } from "@/core/context/empresaContext";

import type { PrecificacaoRepositoryPort } from "../precificacaoRepositoryPort";

import {
  PARAMETROS_PADRAO,
  ehCanalDeVenda,
  type CanalDeVenda,
  type CanalPrecificacaoDados,
  type ParametrosPrecificacao,
  type PrecoDoProduto,
} from "../../types/precificacao";

import { lerMargensCenario } from "../../services/calcularPreco";

export class PrecificacaoRepositoryPostgres
  implements PrecificacaoRepositoryPort
{
  constructor(private readonly contexto: EmpresaContext) {}

  async buscarParametros(): Promise<ParametrosPrecificacao> {
    const linha = await prisma.configuracaoPrecificacao.findUnique({
      where: { empresaId: this.contexto.empresaId },
    });

    if (!linha) {
      return { ...PARAMETROS_PADRAO };
    }

    let margens = PARAMETROS_PADRAO.margensCenario;

    try {
      margens = lerMargensCenario(linha.margensCenario);
    } catch {
      // Texto inválido no banco: volta para o padrão.
    }

    return {
      pedidosMensaisEstimados: linha.pedidosMensaisEstimados,
      impostoPercentual: Number(linha.impostoPercentual),
      taxaPagamentoPercentual: Number(linha.taxaPagamentoPercentual),
      embalagemPedido: Number(linha.embalagemPedido),
      itensPorPedidoEstimados: Number(linha.itensPorPedidoEstimados),
      margensCenario: margens,
      margemMinimaPercentual: Number(linha.margemMinimaPercentual),
      cmvAlvoPercentual: Number(linha.cmvAlvoPercentual),
    };
  }

  async salvarParametros(
    parametros: Omit<ParametrosPrecificacao, "pedidosMensaisEstimados">
  ): Promise<void> {
    const dados = {
      impostoPercentual: parametros.impostoPercentual,
      taxaPagamentoPercentual: parametros.taxaPagamentoPercentual,
      embalagemPedido: parametros.embalagemPedido,
      itensPorPedidoEstimados: parametros.itensPorPedidoEstimados,
      margensCenario: parametros.margensCenario.join(","),
      margemMinimaPercentual: parametros.margemMinimaPercentual,
      cmvAlvoPercentual: parametros.cmvAlvoPercentual,
    };

    await prisma.configuracaoPrecificacao.upsert({
      where: { empresaId: this.contexto.empresaId },
      create: { empresaId: this.contexto.empresaId, ...dados },
      update: dados,
    });
  }

  async listarCanais(): Promise<CanalPrecificacaoDados[]> {
    const linhas = await prisma.canalPrecificacao.findMany({
      where: { empresaId: this.contexto.empresaId },
    });

    return linhas
      .filter((linha) => ehCanalDeVenda(linha.canal))
      .map((linha) => ({
        canal: linha.canal as CanalDeVenda,
        comissaoPercentual: Number(linha.comissaoPercentual),
        taxaMensal: Number(linha.taxaMensal),
        pedidosMensaisEstimados: linha.pedidosMensaisEstimados,
        ativo: linha.ativo,
      }));
  }

  async salvarCanal(canal: CanalPrecificacaoDados): Promise<void> {
    const dados = {
      comissaoPercentual: canal.comissaoPercentual,
      taxaMensal: canal.taxaMensal,
      pedidosMensaisEstimados: canal.pedidosMensaisEstimados,
      ativo: canal.ativo,
    };

    await prisma.canalPrecificacao.upsert({
      where: {
        empresaId_canal: {
          empresaId: this.contexto.empresaId,
          canal: canal.canal,
        },
      },
      create: {
        empresaId: this.contexto.empresaId,
        canal: canal.canal,
        ...dados,
      },
      update: dados,
    });
  }

  async listarPrecos(): Promise<PrecoDoProduto[]> {
    const linhas = await prisma.precoProduto.findMany({
      where: { empresaId: this.contexto.empresaId },
    });

    return linhas
      .filter((linha) => ehCanalDeVenda(linha.canal))
      .map((linha) => ({
        produtoId: linha.produtoId,
        canal: linha.canal as CanalDeVenda,
        preco: Number(linha.preco),
        custoReferencia:
          linha.custoReferencia !== null
            ? Number(linha.custoReferencia)
            : undefined,
        margemReferencia:
          linha.margemReferencia !== null
            ? Number(linha.margemReferencia)
            : undefined,
      }));
  }

  async salvarPreco(preco: PrecoDoProduto): Promise<void> {
    await prisma.precoProduto.upsert({
      where: {
        empresaId_produtoId_canal: {
          empresaId: this.contexto.empresaId,
          produtoId: preco.produtoId,
          canal: preco.canal,
        },
      },
      create: {
        empresaId: this.contexto.empresaId,
        produtoId: preco.produtoId,
        canal: preco.canal,
        preco: preco.preco,
        custoReferencia: preco.custoReferencia ?? null,
        margemReferencia: preco.margemReferencia ?? null,
      },
      update: {
        preco: preco.preco,
        custoReferencia: preco.custoReferencia ?? null,
        margemReferencia: preco.margemReferencia ?? null,
      },
    });
  }

  async removerPreco(
    produtoId: string,
    canal: CanalDeVenda
  ): Promise<void> {
    await prisma.precoProduto.deleteMany({
      where: {
        empresaId: this.contexto.empresaId,
        produtoId,
        canal,
      },
    });
  }
}

export function criarPrecificacaoRepositoryPostgres(
  contexto: EmpresaContext
): PrecificacaoRepositoryPostgres {
  return new PrecificacaoRepositoryPostgres(contexto);
}
