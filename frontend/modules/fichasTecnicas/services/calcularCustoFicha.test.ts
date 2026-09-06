import {
  calcularCustoFicha,
} from "./calcularCustoFicha";

function verificar(
  nome: string,
  esperado: number,
  recebido: number
) {
  const tolerancia = 0.000001;

  if (
    Math.abs(
      esperado - recebido
    ) > tolerancia
  ) {
    throw new Error(
      `${nome}: esperado ${esperado}, recebido ${recebido}`
    );
  }

  console.log(`✅ ${nome}`);
}

const resultado =
  calcularCustoFicha(
    [
      {
        tipo: "INSUMO",

        insumoId: "carne-001",

        quantidade: 160,

        unidade: "g",

        percentualPerda: 0,

        quantidadeCompra: 1,

        precoCompra: 35,

        unidadeCompra: "kg",
      },

      {
        tipo: "INSUMO",

        insumoId: "bacon-001",

        quantidade: 30,

        unidade: "g",

        percentualPerda: 0,

        quantidadeCompra: 1,

        precoCompra: 115,

        unidadeCompra: "kg",
      },
    ],

    2
  );

/*
 * Carne:
 *
 * R$ 35 / 1000 g
 * = R$ 0,035/g
 *
 * 160 g × R$ 0,035
 * = R$ 5,60
 */

verificar(
  "Custo da carne",
  5.6,
  resultado.itens[0]
    .custoCalculado
);

/*
 * Bacon:
 *
 * R$ 115 / 1000 g
 * = R$ 0,115/g
 *
 * 30 g × R$ 0,115
 * = R$ 3,45
 */

verificar(
  "Custo do bacon",
  3.45,
  resultado.itens[1]
    .custoCalculado
);

/*
 * Ingredientes:
 *
 * 5,60 + 3,45
 * = 9,05
 */

verificar(
  "Custo dos ingredientes",
  9.05,
  resultado.custoIngredientes
);

/*
 * Embalagem:
 *
 * R$ 2,00
 */

verificar(
  "Custo da embalagem",
  2,
  resultado.custoEmbalagem
);

/*
 * Total:
 *
 * 9,05 + 2,00
 * = 11,05
 */

verificar(
  "Custo total da ficha",
  11.05,
  resultado.custoTotal
);

console.log(
  "✅ Todos os testes do cálculo da ficha passaram."
);