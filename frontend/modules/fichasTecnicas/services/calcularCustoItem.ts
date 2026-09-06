import {
  converterQuantidade,
} from "./conversaoUnidade";

export interface DadosCustoItem {
  quantidadeCompra: number;
  precoCompra: number;
  unidadeCompra: string;

  quantidadeFicha: number;
  unidadeFicha: string;

  percentualPerda: number;
}

export function calcularCustoItem(
  dados: DadosCustoItem
): number {
  if (
    dados.quantidadeCompra <= 0
  ) {
    throw new Error(
      "Quantidade de compra deve ser maior que zero."
    );
  }

  if (dados.precoCompra < 0) {
    throw new Error(
      "Preço de compra não pode ser negativo."
    );
  }

  if (
    dados.quantidadeFicha <= 0
  ) {
    throw new Error(
      "Quantidade utilizada deve ser maior que zero."
    );
  }

  if (
    dados.percentualPerda < 0 ||
    dados.percentualPerda >= 100
  ) {
    throw new Error(
      "Percentual de perda deve estar entre 0 e 99,99."
    );
  }

  const quantidadeConvertida =
    converterQuantidade(
      dados.quantidadeCompra,
      dados.unidadeCompra,
      dados.unidadeFicha
    );

  const custoPorUnidadeFicha =
    dados.precoCompra /
    quantidadeConvertida;

  const fatorPerda =
    1 +
    dados.percentualPerda / 100;

  return (
    dados.quantidadeFicha *
    custoPorUnidadeFicha *
    fatorPerda
  );
}