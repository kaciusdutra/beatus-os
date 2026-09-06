import {
  calcularCustoItem,
} from "./calcularCustoItem";

function esperarErro(
  callback: () => number,
  mensagem: string
) {
  try {
    callback();

    throw new Error(
      `Era esperado um erro contendo: "${mensagem}"`
    );
  } catch (erro) {
    if (!(erro instanceof Error)) {
      throw erro;
    }

    if (!erro.message.includes(mensagem)) {
      throw new Error(
        `Erro diferente do esperado.\nEsperado: "${mensagem}"\nRecebido: "${erro.message}"`
      );
    }
  }
}

function verificar(
  nome: string,
  esperado: number,
  recebido: number
) {
  const tolerancia = 0.000001;

  if (
    Math.abs(esperado - recebido) >
    tolerancia
  ) {
    throw new Error(
      `${nome}: esperado ${esperado}, recebido ${recebido}`
    );
  }

  console.log(`✅ ${nome}`);
}

/*
 * 1 kg de bacon custa R$ 115,00.
 * A ficha usa 30 g.
 *
 * 115 / 1000 = 0,115 por grama
 * 30 × 0,115 = 3,45
 */
verificar(
  "kg → g sem perda",
  3.45,
  calcularCustoItem({
    quantidadeCompra: 1,
    precoCompra: 115,
    unidadeCompra: "kg",

    quantidadeFicha: 30,
    unidadeFicha: "g",

    percentualPerda: 0,
  })
);

/*
 * 1 litro custa R$ 10,00.
 * A ficha usa 100 ml.
 */
verificar(
  "L → ml sem perda",
  1,
  calcularCustoItem({
    quantidadeCompra: 1,
    precoCompra: 10,
    unidadeCompra: "L",

    quantidadeFicha: 100,
    unidadeFicha: "ml",

    percentualPerda: 0,
  })
);

/*
 * Unidade → unidade.
 */
verificar(
  "un → un",
  3,
  calcularCustoItem({
    quantidadeCompra: 10,
    precoCompra: 30,
    unidadeCompra: "un",

    quantidadeFicha: 1,
    unidadeFicha: "un",

    percentualPerda: 0,
  })
);

/*
 * Perda operacional de 5%.
 *
 * 30 g × 1,05 = 31,5 g equivalentes.
 * 31,5 × 0,115 = 3,6225
 */
verificar(
  "kg → g com 5% de perda",
  3.6225,
  calcularCustoItem({
    quantidadeCompra: 1,
    precoCompra: 115,
    unidadeCompra: "kg",

    quantidadeFicha: 30,
    unidadeFicha: "g",

    percentualPerda: 5,
  })
);

/*
 * Quantidade de compra inválida.
 */
esperarErro(
  () =>
    calcularCustoItem({
      quantidadeCompra: 0,
      precoCompra: 115,
      unidadeCompra: "kg",

      quantidadeFicha: 30,
      unidadeFicha: "g",

      percentualPerda: 0,
    }),
  "Quantidade de compra deve ser maior que zero."
);

console.log("✅ Quantidade de compra inválida");

/*
 * Preço negativo.
 */
esperarErro(
  () =>
    calcularCustoItem({
      quantidadeCompra: 1,
      precoCompra: -10,
      unidadeCompra: "kg",

      quantidadeFicha: 30,
      unidadeFicha: "g",

      percentualPerda: 0,
    }),
  "Preço de compra não pode ser negativo."
);

console.log("✅ Preço negativo");

esperarErro(
  () =>
    calcularCustoItem({
      quantidadeCompra: 1,
      precoCompra: 115,
      unidadeCompra: "kg",

      quantidadeFicha: 0,
      unidadeFicha: "g",

      percentualPerda: 0,
    }),
  "Quantidade utilizada deve ser maior que zero."
);

console.log("✅ Quantidade utilizada inválida");

/*
 * Conversão incompatível.
 */
esperarErro(
  () =>
    calcularCustoItem({
      quantidadeCompra: 1,
      precoCompra: 115,
      unidadeCompra: "kg",

      quantidadeFicha: 1,
      unidadeFicha: "un",

      percentualPerda: 0,
    }),
  "Não é possível converter"
);

console.log("✅ Unidade incompatível");

/*
 * Perda inválida.
 */
esperarErro(
  () =>
    calcularCustoItem({
      quantidadeCompra: 1,
      precoCompra: 115,
      unidadeCompra: "kg",

      quantidadeFicha: 30,
      unidadeFicha: "g",

      percentualPerda: 100,
    }),
  "Percentual de perda deve estar entre 0 e 99,99."
);

console.log("✅ Perda inválida");

console.log(
  "✅ Todos os testes do cálculo de custo passaram."
);