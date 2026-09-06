import {
  calcularCustoItem,
  DadosCustoItem,
} from "./calcularCustoItem";

export interface ItemInsumoParaCusto {
  tipo: "INSUMO";

  insumoId: string;

  quantidade: number;

  unidade: string;

  percentualPerda: number;

  quantidadeCompra: number;

  precoCompra: number;

  unidadeCompra: string;
}

export interface ResultadoCustoItem {
  insumoId: string;

  quantidade: number;

  unidade: string;

  percentualPerda: number;

  custoCalculado: number;
}

export interface ResultadoCustoFicha {
  itens: ResultadoCustoItem[];

  custoIngredientes: number;

  custoEmbalagem: number;

  custoTotal: number;
}

export function calcularCustoFicha(
  itens: ItemInsumoParaCusto[],
  custoEmbalagem: number = 0
): ResultadoCustoFicha {
  if (custoEmbalagem < 0) {
    throw new Error(
      "Custo de embalagem não pode ser negativo."
    );
  }

  const resultados: ResultadoCustoItem[] =
    itens.map((item) => {
      const dados: DadosCustoItem = {
        quantidadeCompra:
          item.quantidadeCompra,

        precoCompra:
          item.precoCompra,

        unidadeCompra:
          item.unidadeCompra,

        quantidadeFicha:
          item.quantidade,

        unidadeFicha:
          item.unidade,

        percentualPerda:
          item.percentualPerda,
      };

      const custo =
        calcularCustoItem(dados);

      return {
        insumoId:
          item.insumoId,

        quantidade:
          item.quantidade,

        unidade:
          item.unidade,

        percentualPerda:
          item.percentualPerda,

        custoCalculado:
          custo,
      };
    });

  const custoIngredientes =
    resultados.reduce(
      (total, item) =>
        total + item.custoCalculado,
      0
    );

  const custoTotal =
    custoIngredientes +
    custoEmbalagem;

  return {
    itens: resultados,

    custoIngredientes,

    custoEmbalagem,

    custoTotal,
  };
}