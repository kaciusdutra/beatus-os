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
 * Perda de 5%: o custo é dividido pelo aproveitamento (regra 7.5).
 *
 * 30 g × 0,115 = 3,45 ÷ 0,95 = 3,63157894...
 */
verificar(
  "kg → g com 5% de perda",
  3.45 / 0.95,
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
 * Perda de 20%: o custo sobe 25%, não 20% (aproveita-se 80%).
 */
verificar(
  "20% de perda sobe o custo em 25%",
  3.45 / 0.8,
  calcularCustoItem({
    quantidadeCompra: 1,
    precoCompra: 115,
    unidadeCompra: "kg",
    quantidadeFicha: 30,
    unidadeFicha: "g",
    percentualPerda: 20,
  })
);

/*
 * Duas perdas: limpeza 15% e cocção 29,4% (exemplo do bacon: 1.000 g
 * viram 850 g e depois 600 g). Aproveitamento = 0,85 × 0,706.
 */
verificar(
  "perda de limpeza e de cocção juntas",
  3.45 / (0.85 * 0.706),
  calcularCustoItem({
    quantidadeCompra: 1,
    precoCompra: 115,
    unidadeCompra: "kg",
    quantidadeFicha: 30,
    unidadeFicha: "g",
    perdaLimpeza: 15,
    percentualPerda: 29.4,
  })
);

/*
 * Só a perda de limpeza (abacaxi: casca). R$ 5,00 a unidade, 1 un = 900 g,
 * 40% de casca, a ficha usa 35 g aproveitáveis.
 */
verificar(
  "abacaxi: unidade com equivalência em g e perda de limpeza",
  ((35 / 900) * 5) / 0.6,
  calcularCustoItem({
    quantidadeCompra: 1,
    precoCompra: 5,
    unidadeCompra: "un",
    equivalenciaQuantidade: 900,
    equivalenciaUnidade: "g",
    quantidadeFicha: 35,
    unidadeFicha: "g",
    perdaLimpeza: 40,
    percentualPerda: 0,
  })
);

/*
 * Pacote de pães: 6 pacotes por R$ 11, cada pacote com 6 un.
 */
verificar(
  "pão: pct com equivalência em un",
  11 / 6 / 6,
  calcularCustoItem({
    quantidadeCompra: 6,
    precoCompra: 11,
    unidadeCompra: "pct",
    equivalenciaQuantidade: 6,
    equivalenciaUnidade: "un",
    quantidadeFicha: 1,
    unidadeFicha: "un",
    percentualPerda: 0,
  })
);

/*
 * Equivalência em kg usada em g (maço de rúcula: 1 un = 0,15 kg).
 */
verificar(
  "rúcula: equivalência em kg usada em g",
  (0.01 / 0.15) * 7.9,
  calcularCustoItem({
    quantidadeCompra: 1,
    precoCompra: 7.9,
    unidadeCompra: "un",
    equivalenciaQuantidade: 0.15,
    equivalenciaUnidade: "kg",
    quantidadeFicha: 10,
    unidadeFicha: "g",
    percentualPerda: 0,
  })
);

/*
 * Sem equivalência, pct para un não converte e a mensagem orienta o usuário.
 */
esperarErro(
  () =>
    calcularCustoItem({
      quantidadeCompra: 6,
      precoCompra: 11,
      unidadeCompra: "pct",
      quantidadeFicha: 1,
      unidadeFicha: "un",
      percentualPerda: 0,
    }),
  "Informe a equivalência do insumo"
);
console.log("✅ Sem equivalência, orienta o usuário");

esperarErro(
  () =>
    calcularCustoItem({
      quantidadeCompra: 1,
      precoCompra: 5,
      unidadeCompra: "un",
      equivalenciaQuantidade: 0,
      equivalenciaUnidade: "g",
      quantidadeFicha: 35,
      unidadeFicha: "g",
      percentualPerda: 0,
    }),
  "equivalência do insumo deve ser maior que zero"
);
console.log("✅ Equivalência zerada");

esperarErro(
  () =>
    calcularCustoItem({
      quantidadeCompra: 1,
      precoCompra: 5,
      unidadeCompra: "kg",
      quantidadeFicha: 35,
      unidadeFicha: "g",
      perdaLimpeza: 100,
      percentualPerda: 0,
    }),
  "Perda de limpeza deve estar entre 0 e 99,99."
);
console.log("✅ Perda de limpeza inválida");

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