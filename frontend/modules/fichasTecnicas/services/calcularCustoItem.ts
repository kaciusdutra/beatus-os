import {
  converterSeCompativel,
} from "./conversaoUnidade";

export interface DadosCustoItem {
  quantidadeCompra: number;
  precoCompra: number;
  unidadeCompra: string;

  // Equivalência do insumo (bloco 8B): 1 unidade de compra = N unidades de uso.
  // Exemplos: 1 pct = 6 un; 1 maço = 150 g.
  equivalenciaQuantidade?: number;
  equivalenciaUnidade?: string;

  quantidadeFicha: number;
  unidadeFicha: string;

  // Perda de limpeza do insumo, em % (casca, osso, aparas). Opcional.
  perdaLimpeza?: number;

  // Perda de cocção ou preparo deste uso na ficha, em %.
  percentualPerda: number;
}

// Regra 7.5: o custo é dividido pelo aproveitamento (100% menos a perda).
// Com as duas perdas, o aproveitamento é o produto das duas etapas.
export function calcularAproveitamento(
  perdaLimpeza: number,
  perdaCoccao: number
): number {
  if (perdaLimpeza < 0 || perdaLimpeza >= 100) {
    throw new Error(
      "Perda de limpeza deve estar entre 0 e 99,99."
    );
  }

  if (perdaCoccao < 0 || perdaCoccao >= 100) {
    throw new Error(
      "Percentual de perda deve estar entre 0 e 99,99."
    );
  }

  return (
    (1 - perdaLimpeza / 100) *
    (1 - perdaCoccao / 100)
  );
}

// Quanto da unidade de compra a ficha usa.
function quantidadeNaUnidadeDeCompra(
  dados: DadosCustoItem
): number {
  const direta = converterSeCompativel(
    dados.quantidadeFicha,
    dados.unidadeFicha,
    dados.unidadeCompra
  );

  if (direta !== undefined) {
    return direta;
  }

  const { equivalenciaQuantidade, equivalenciaUnidade } =
    dados;

  if (
    equivalenciaQuantidade !== undefined &&
    equivalenciaUnidade?.trim()
  ) {
    if (equivalenciaQuantidade <= 0) {
      throw new Error(
        "A equivalência do insumo deve ser maior que zero."
      );
    }

    const naEquivalencia = converterSeCompativel(
      dados.quantidadeFicha,
      dados.unidadeFicha,
      equivalenciaUnidade
    );

    if (naEquivalencia !== undefined) {
      return naEquivalencia / equivalenciaQuantidade;
    }
  }

  throw new Error(
    `Não é possível converter ${dados.unidadeFicha} para ${dados.unidadeCompra}. Informe a equivalência do insumo (exemplo: 1 ${dados.unidadeCompra} = N ${dados.unidadeFicha}).`
  );
}

export function calcularCustoItem(
  dados: DadosCustoItem
): number {
  if (dados.quantidadeCompra <= 0) {
    throw new Error(
      "Quantidade de compra deve ser maior que zero."
    );
  }

  if (dados.precoCompra < 0) {
    throw new Error(
      "Preço de compra não pode ser negativo."
    );
  }

  if (dados.quantidadeFicha <= 0) {
    throw new Error(
      "Quantidade utilizada deve ser maior que zero."
    );
  }

  const aproveitamento = calcularAproveitamento(
    dados.perdaLimpeza ?? 0,
    dados.percentualPerda
  );

  const custoPorUnidadeDeCompra =
    dados.precoCompra / dados.quantidadeCompra;

  return (
    (quantidadeNaUnidadeDeCompra(dados) *
      custoPorUnidadeDeCompra) /
    aproveitamento
  );
}
