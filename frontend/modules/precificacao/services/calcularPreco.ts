// Bloco 8G: preço de venda, CMV, markup e margem. Funções puras.
//
// A margem é LÍQUIDA (decisão do Kacius): lucro sobre o preço de venda,
// depois de descontar o custo da ficha, a embalagem do pedido, o custo fixo
// rateado, a taxa mensal do canal, a comissão do canal, o imposto e a taxa de
// pagamento (regra 4.5: imposto e taxa de pagamento vão embutidos no preço).

export interface CustosDoPedido {
  // Custo da ficha do produto (já com a embalagem do produto), em R$.
  custoFicha: number;

  // Custo da embalagem de um pedido (sacola, guardanapo, sachê), em R$.
  embalagemPedido: number;

  // Custo fixo de um pedido (total do mês / pedidos do mês), em R$.
  custoFixoPorPedido: number;

  // Quantos produtos, em média, vão em um pedido: rateia os custos por pedido.
  itensPorPedido: number;

  // Taxa fixa do canal por pedido (taxa mensal / pedidos do canal no mês), em R$.
  taxaCanalPorPedido: number;
}

export interface PercentuaisSobrePreco {
  comissaoPercentual: number;
  impostoPercentual: number;
  taxaPagamentoPercentual: number;
}

function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;

  return Math.round(valor * fator) / fator;
}

function itensValidos(itensPorPedido: number): number {
  return itensPorPedido > 0 ? itensPorPedido : 1;
}

// Custo total de UM produto, rateando o que é por pedido.
export function custoTotalDoProduto(custos: CustosDoPedido): number {
  const itens = itensValidos(custos.itensPorPedido);

  return arredondar(
    custos.custoFicha +
      (custos.embalagemPedido +
        custos.custoFixoPorPedido +
        custos.taxaCanalPorPedido) /
        itens,
    4
  );
}

export function somaPercentuais(
  percentuais: PercentuaisSobrePreco
): number {
  return (
    percentuais.comissaoPercentual +
    percentuais.impostoPercentual +
    percentuais.taxaPagamentoPercentual
  );
}

// Preço exato para atingir a margem líquida pedida. Indefinido quando os
// percentuais mais a margem passam de 100% (nenhum preço resolve).
export function precoParaMargem(
  custoTotal: number,
  percentuais: PercentuaisSobrePreco,
  margemPercentual: number
): number | undefined {
  const denominador =
    1 - (somaPercentuais(percentuais) + margemPercentual) / 100;

  if (!(denominador > 0)) {
    return undefined;
  }

  return arredondar(custoTotal / denominador, 4);
}

// Preço comercial: sobe até o próximo final ,90 (sem ficar abaixo do exato).
export function precoComercial(preco: number): number {
  const base = Math.floor(preco) + 0.9;

  const candidato = base >= preco - 1e-9 ? base : base + 1;

  return arredondar(candidato, 2);
}

export interface ResultadoDoPreco {
  preco: number;

  // Dinheiro que sobra depois de todos os custos e percentuais, em R$.
  lucro: number;

  // Lucro sobre o preço de venda, em %.
  margemPercentual: number;

  // Custo da ficha sobre o preço de venda, em %.
  cmvPercentual: number;

  // (preço - custo da ficha) / custo da ficha, em %.
  markupPercentual: number | undefined;
}

// O que um preço de venda rende.
export function resultadoDoPreco(
  preco: number,
  custos: CustosDoPedido,
  percentuais: PercentuaisSobrePreco
): ResultadoDoPreco | undefined {
  if (!(preco > 0)) {
    return undefined;
  }

  const custoTotal = custoTotalDoProduto(custos);

  const lucro =
    preco * (1 - somaPercentuais(percentuais) / 100) - custoTotal;

  return {
    preco,
    lucro: arredondar(lucro, 4),
    margemPercentual: arredondar((lucro / preco) * 100, 2),
    cmvPercentual: arredondar((custos.custoFicha / preco) * 100, 2),
    markupPercentual:
      custos.custoFicha > 0
        ? arredondar(
            ((preco - custos.custoFicha) / custos.custoFicha) * 100,
            2
          )
        : undefined,
  };
}

// "20, 25;30 35" -> [20, 25, 30, 35] (ordenado, sem repetir).
export function lerMargensCenario(texto: string): number[] {
  const valores = texto
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((parte) => Number(parte.replace(",", ".")));

  if (valores.length === 0) {
    throw new Error("Informe ao menos uma margem.");
  }

  for (const valor of valores) {
    if (!Number.isFinite(valor) || valor < 0 || valor >= 100) {
      throw new Error(
        "Cada margem deve ser um número de 0 a 99,99."
      );
    }
  }

  return [...new Set(valores)].sort((a, b) => a - b);
}
