import type { PrecificacaoRepositoryPort } from "../repositories/precificacaoRepositoryPort";

import {
  CANAIS_DE_VENDA,
  ehCanalDeVenda,
  type CanalDeVenda,
  type CanalPrecificacaoDados,
  type ParametrosPrecificacao,
  type PrecoDoProduto,
} from "../types/precificacao";

import { lerMargensCenario } from "./calcularPreco";

function percentual(valor: number, rotulo: string): number {
  if (!Number.isFinite(valor) || valor < 0 || valor >= 100) {
    throw new Error(`${rotulo} deve estar entre 0 e 99,99.`);
  }

  return valor;
}

function naoNegativo(valor: number, rotulo: string): number {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`${rotulo} deve ser zero ou maior.`);
  }

  return valor;
}

export interface EntradaParametros {
  impostoPercentual: number;
  taxaPagamentoPercentual: number;
  embalagemPedido: number;
  itensPorPedidoEstimados: number;
  margensCenario: string | number[];
  margemMinimaPercentual: number;
  cmvAlvoPercentual: number;
}

export class PrecificacaoService {
  constructor(
    private readonly repository: PrecificacaoRepositoryPort
  ) {}

  async buscarParametros(): Promise<ParametrosPrecificacao> {
    return this.repository.buscarParametros();
  }

  async salvarParametros(
    entrada: EntradaParametros
  ): Promise<ParametrosPrecificacao> {
    if (
      !Number.isFinite(entrada.itensPorPedidoEstimados) ||
      entrada.itensPorPedidoEstimados < 1
    ) {
      throw new Error(
        "Os produtos por pedido devem ser 1 ou mais."
      );
    }

    const margens =
      typeof entrada.margensCenario === "string"
        ? lerMargensCenario(entrada.margensCenario)
        : lerMargensCenario(entrada.margensCenario.join(","));

    if (margens.length > 6) {
      throw new Error("Use no máximo 6 margens.");
    }

    await this.repository.salvarParametros({
      impostoPercentual: percentual(
        entrada.impostoPercentual,
        "O imposto"
      ),
      taxaPagamentoPercentual: percentual(
        entrada.taxaPagamentoPercentual,
        "A taxa de pagamento"
      ),
      embalagemPedido: naoNegativo(
        entrada.embalagemPedido,
        "A embalagem do pedido"
      ),
      itensPorPedidoEstimados: entrada.itensPorPedidoEstimados,
      margensCenario: margens,
      margemMinimaPercentual: percentual(
        entrada.margemMinimaPercentual,
        "A margem mínima"
      ),
      cmvAlvoPercentual: percentual(
        entrada.cmvAlvoPercentual,
        "O CMV-alvo"
      ),
    });

    return this.repository.buscarParametros();
  }

  // Sempre devolve os cinco canais, com zeros nos que ainda não foram salvos.
  async listarCanais(): Promise<CanalPrecificacaoDados[]> {
    const salvos = await this.repository.listarCanais();

    return CANAIS_DE_VENDA.map(
      (canal) =>
        salvos.find((item) => item.canal === canal.chave) ?? {
          canal: canal.chave,
          comissaoPercentual: 0,
          taxaMensal: 0,
          pedidosMensaisEstimados: 0,
          ativo: true,
        }
    );
  }

  async salvarCanal(
    dados: CanalPrecificacaoDados
  ): Promise<CanalPrecificacaoDados> {
    if (!ehCanalDeVenda(dados.canal)) {
      throw new Error("Canal de venda inválido.");
    }

    const canal: CanalPrecificacaoDados = {
      canal: dados.canal,
      comissaoPercentual: percentual(
        dados.comissaoPercentual,
        "A comissão"
      ),
      taxaMensal: naoNegativo(dados.taxaMensal, "A taxa mensal"),
      pedidosMensaisEstimados: (() => {
        if (
          !Number.isInteger(dados.pedidosMensaisEstimados) ||
          dados.pedidosMensaisEstimados < 0
        ) {
          throw new Error(
            "Os pedidos por mês do canal devem ser um número inteiro, zero ou maior."
          );
        }

        return dados.pedidosMensaisEstimados;
      })(),
      ativo: dados.ativo,
    };

    await this.repository.salvarCanal(canal);

    return canal;
  }

  async listarPrecos(): Promise<PrecoDoProduto[]> {
    return this.repository.listarPrecos();
  }

  // Preço praticado de um produto em um canal. Vazio (null) remove.
  async salvarPreco(
    produtoId: string,
    canal: CanalDeVenda,
    preco: number | null,
    referencia?: {
      custoReferencia?: number | null;
      margemReferencia?: number | null;
    }
  ): Promise<void> {
    if (!produtoId.trim()) {
      throw new Error("Produto é obrigatório.");
    }

    if (!ehCanalDeVenda(canal)) {
      throw new Error("Canal de venda inválido.");
    }

    if (preco === null) {
      await this.repository.removerPreco(produtoId, canal);

      return;
    }

    if (!Number.isFinite(preco) || preco <= 0) {
      throw new Error("O preço deve ser maior que zero.");
    }

    const custoReferencia = referencia?.custoReferencia ?? undefined;

    const margemReferencia = referencia?.margemReferencia ?? undefined;

    for (const valor of [custoReferencia, margemReferencia]) {
      if (valor !== undefined && !Number.isFinite(valor)) {
        throw new Error("A referência de custo ou margem é inválida.");
      }
    }

    await this.repository.salvarPreco({
      produtoId,
      canal,
      preco: Math.round(preco * 100) / 100,
      custoReferencia,
      margemReferencia,
    });
  }
}
