import {
  resultadoDoPreco,
  type CustosDoPedido,
  type PercentuaisSobrePreco,
  type ResultadoDoPreco,
} from "./calcularPreco";

import type {
  CanalPrecificacaoDados,
  ParametrosPrecificacao,
} from "../types/precificacao";

// Bloco 8H: simulação de promoção, desconto de combo e aviso de impacto.
// Funções puras.

function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;

  return Math.round(valor * fator) / fator;
}

// Percentuais e taxa por pedido de um canal, a partir dos parâmetros.
export function parametrosDoCanal(
  parametros: ParametrosPrecificacao,
  canal: CanalPrecificacaoDados
): { percentuais: PercentuaisSobrePreco; taxaCanalPorPedido: number } {
  return {
    percentuais: {
      comissaoPercentual: canal.comissaoPercentual,
      impostoPercentual: parametros.impostoPercentual,
      taxaPagamentoPercentual: parametros.taxaPagamentoPercentual,
    },
    taxaCanalPorPedido:
      canal.pedidosMensaisEstimados > 0
        ? canal.taxaMensal / canal.pedidosMensaisEstimados
        : 0,
  };
}

export type Promocao =
  | { tipo: "PERCENTUAL"; valor: number }
  | { tipo: "PRECO"; valor: number };

export interface SimulacaoDePromocao {
  precoNormal: number;

  precoPromocional: number;

  descontoReais: number;

  descontoPercentual: number;

  normal: ResultadoDoPreco;

  promocional: ResultadoDoPreco;

  // Quantos % a mais de pedidos são necessários para o lucro total igualar
  // o do preço normal. Indefinido quando a promoção não dá lucro por pedido
  // (nenhum volume compensa) ou quando o preço normal já não dava lucro.
  volumeParaCompensarPercentual: number | undefined;
}

// Preço promocional a partir do preço normal e da promoção pedida.
export function precoDaPromocao(
  precoNormal: number,
  promocao: Promocao
): number | undefined {
  const preco =
    promocao.tipo === "PERCENTUAL"
      ? precoNormal * (1 - promocao.valor / 100)
      : promocao.valor;

  if (!Number.isFinite(preco) || !(preco > 0)) {
    return undefined;
  }

  return arredondar(preco, 2);
}

export function simularPromocao(
  precoNormal: number,
  promocao: Promocao,
  custos: CustosDoPedido,
  percentuais: PercentuaisSobrePreco
): SimulacaoDePromocao | undefined {
  const precoPromocional = precoDaPromocao(precoNormal, promocao);

  if (precoPromocional === undefined) {
    return undefined;
  }

  const normal = resultadoDoPreco(precoNormal, custos, percentuais);

  const promocional = resultadoDoPreco(
    precoPromocional,
    custos,
    percentuais
  );

  if (!normal || !promocional) {
    return undefined;
  }

  let volume: number | undefined;

  if (normal.lucro > 0 && promocional.lucro > 0) {
    volume = arredondar((normal.lucro / promocional.lucro - 1) * 100, 1);
  }

  return {
    precoNormal,
    precoPromocional,
    descontoReais: arredondar(precoNormal - precoPromocional, 2),
    descontoPercentual: arredondar(
      ((precoNormal - precoPromocional) / precoNormal) * 100,
      2
    ),
    normal,
    promocional,
    volumeParaCompensarPercentual:
      volume !== undefined && volume < 0 ? 0 : volume,
  };
}

export interface EconomiaDoCombo {
  somaAvulsa: number;

  precoCombo: number;

  economiaReais: number;

  economiaPercentual: number;
}

// Quanto o cliente economiza no combo em relação aos preços avulsos.
export function economiaDoCombo(
  precosAvulsos: number[],
  precoCombo: number
): EconomiaDoCombo | undefined {
  if (precosAvulsos.length === 0 || !(precoCombo > 0)) {
    return undefined;
  }

  const somaAvulsa = arredondar(
    precosAvulsos.reduce((total, preco) => total + preco, 0),
    2
  );

  if (!(somaAvulsa > 0)) {
    return undefined;
  }

  return {
    somaAvulsa,
    precoCombo,
    economiaReais: arredondar(somaAvulsa - precoCombo, 2),
    economiaPercentual: arredondar(
      ((somaAvulsa - precoCombo) / somaAvulsa) * 100,
      2
    ),
  };
}

export type TipoDeAviso = "CUSTO_SUBIU" | "ABAIXO_DA_MINIMA" | "PREJUIZO";

export interface AvisoDeImpacto {
  tipos: TipoDeAviso[];

  // Variação do custo desde que o preço foi fixado, em %. Indefinido sem referência.
  variacaoDoCustoPercentual: number | undefined;
}

// Quando o aviso de impacto aparece (decisão do Kacius):
// - o custo subiu LIMITE% ou mais desde que o preço foi fixado;
// - a margem ficou abaixo da mínima (a menos que o preço já tenha sido fixado
//   abaixo da mínima, ou seja, uma promoção conhecida, e o custo não subiu);
// - o preço dá prejuízo.
export function avisoDeImpacto(dados: {
  custoReferencia?: number;
  margemReferencia?: number;
  custoAtual: number;
  margemAtual: number;
  margemMinimaPercentual: number;
  limiteAltaPercentual?: number;
}): AvisoDeImpacto | undefined {
  const limite = dados.limiteAltaPercentual ?? 5;

  const variacao =
    dados.custoReferencia !== undefined && dados.custoReferencia > 0
      ? arredondar(
          ((dados.custoAtual - dados.custoReferencia) /
            dados.custoReferencia) *
            100,
          2
        )
      : undefined;

  const tipos: TipoDeAviso[] = [];

  const custoSubiu = variacao !== undefined && variacao >= limite;

  if (custoSubiu) {
    tipos.push("CUSTO_SUBIU");
  }

  if (dados.margemAtual < 0) {
    tipos.push("PREJUIZO");
  } else if (dados.margemAtual < dados.margemMinimaPercentual) {
    const promocaoConhecida =
      dados.margemReferencia !== undefined &&
      dados.margemReferencia < dados.margemMinimaPercentual;

    if (!promocaoConhecida || custoSubiu) {
      tipos.push("ABAIXO_DA_MINIMA");
    }
  }

  return tipos.length > 0
    ? { tipos, variacaoDoCustoPercentual: variacao }
    : undefined;
}
