import {
  calcularCustoPreparacao,
} from "./calcularCustoPreparacao";

import {
  FichaTecnica,
} from "../types/fichaTecnica";


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


function esperarErro(
  callback: () => unknown,
  mensagem: string
) {
  try {
    callback();

    throw new Error(
      `Era esperado erro contendo: "${mensagem}"`
    );
  } catch (erro) {
    if (!(erro instanceof Error)) {
      throw erro;
    }

    if (!erro.message.includes(mensagem)) {
      throw new Error(
        `Erro diferente do esperado.\nEsperado: ${mensagem}\nRecebido: ${erro.message}`
      );
    }

    console.log(
      `✅ ${mensagem}`
    );
  }
}


/*
 * PREPARAÇÃO BASE
 *
 * Molho:
 *
 * Leite     R$ 10
 * Provolone R$ 20
 *
 * Custo total = R$ 30
 * Rendimento  = 1.000 g
 *
 * Custo por g = R$ 0,03
 */
const preparacaoMolho: FichaTecnica = {
  id: "prep-molho",
  tipo: "PREPARACAO",
  nome: "Molho",
  rendimento: 1000,
  unidadeRendimento: "g",
  embalagem: 0,
  ativo: true,

  itens: [
    {
      id: "leite",
      tipo: "INSUMO",
      insumoId: "leite",
      quantidade: 500,
      unidade: "ml",
      percentualPerda: 0,
      custoCalculado: 0,
    },
    {
      id: "provolone",
      tipo: "INSUMO",
      insumoId: "provolone",
      quantidade: 200,
      unidade: "g",
      percentualPerda: 0,
      custoCalculado: 0,
    },
  ],

  criadoEm:
    new Date().toISOString(),

  atualizadoEm:
    new Date().toISOString(),
};


const preparacaoNula: FichaTecnica = {
  ...preparacaoMolho,
  id: "preparacao-nula",
  rendimento: 0,
};


const preparacaoSemRendimento: FichaTecnica = {
  ...preparacaoMolho,
  id: "preparacao-sem-rendimento",
  rendimento: undefined,
};


/*
 * CICLO A → B → A
 */
const preparacaoA: FichaTecnica = {
  ...preparacaoMolho,
  id: "preparacao-a",
  nome: "Preparação A",
  rendimento: 100,

  itens: [
    {
      id: "item-a",
      tipo: "PREPARACAO",
      preparacaoId:
        "preparacao-b",
      quantidade: 10,
      unidade: "g",
      percentualPerda: 0,
      custoCalculado: 0,
    },
  ],
};


const preparacaoB: FichaTecnica = {
  ...preparacaoMolho,
  id: "preparacao-b",
  nome: "Preparação B",
  rendimento: 100,

  itens: [
    {
      id: "item-b",
      tipo: "PREPARACAO",
      preparacaoId:
        "preparacao-a",
      quantidade: 10,
      unidade: "g",
      percentualPerda: 0,
      custoCalculado: 0,
    },
  ],
};


/*
 * CICLO A → B → C → A
 */
const preparacaoC: FichaTecnica = {
  ...preparacaoMolho,
  id: "preparacao-c",
  nome: "Preparação C",
  rendimento: 100,

  itens: [
    {
      id: "item-c",
      tipo: "PREPARACAO",
      preparacaoId:
        "preparacao-a",
      quantidade: 10,
      unidade: "g",
      percentualPerda: 0,
      custoCalculado: 0,
    },
  ],
};


/*
 * Mapa de preparações utilizado pelos testes.
 */
const preparacoes = new Map<
  string,
  FichaTecnica
>([
  [
    preparacaoMolho.id,
    preparacaoMolho,
  ],
  [
    preparacaoA.id,
    preparacaoA,
  ],
  [
    preparacaoB.id,
    preparacaoB,
  ],
  [
    preparacaoC.id,
    preparacaoC,
  ],
]);


/*
 * Custos simulados dos insumos.
 */
const custosInsumos: Record<
  string,
  number
> = {
  leite: 10,
  provolone: 20,
};


/*
 * Contexto utilizado pelo cálculo.
 */
const contexto = {
  calcularItem: (item: {
    insumoId?: string;
  }) => {
    if (!item.insumoId) {
      throw new Error(
        "Insumo não informado."
      );
    }

    return (
      custosInsumos[
        item.insumoId
      ] ?? 0
    );
  },

  buscarPreparacao: (
    preparacaoId: string
  ) =>
    preparacoes.get(
      preparacaoId
    ),
};


/*
 * TESTE 1
 *
 * Custo normal da preparação.
 */
const resultado =
  calcularCustoPreparacao(
    preparacaoMolho,
    contexto
  );

verificar(
  "Custo total da preparação",
  30,
  resultado.custoTotal
);

verificar(
  "Rendimento da preparação",
  1000,
  resultado.rendimento
);

verificar(
  "Custo por unidade de rendimento",
  0.03,
  resultado.custoPorUnidade
);


/*
 * TESTE 2
 *
 * Rendimento zero.
 */
esperarErro(
  () =>
    calcularCustoPreparacao(
      preparacaoNula,
      contexto
    ),
  "precisa possuir um rendimento maior que zero"
);


/*
 * TESTE 3
 *
 * Rendimento inexistente.
 */
esperarErro(
  () =>
    calcularCustoPreparacao(
      preparacaoSemRendimento,
      contexto
    ),
  "precisa possuir um rendimento maior que zero"
);


/*
 * TESTE 4
 *
 * Ciclo:
 *
 * A → B → A
 */
esperarErro(
  () =>
    calcularCustoPreparacao(
      preparacaoA,
      contexto
    ),
  "Ciclo detectado entre fichas técnicas"
);


/*
 * TESTE 5
 *
 * Ciclo:
 *
 * A → B → C → A
 */
esperarErro(
  () =>
    calcularCustoPreparacao(
      preparacaoA,
      {
        calcularItem: contexto.calcularItem,

        buscarPreparacao: (
          preparacaoId: string
        ) => {
          if (
            preparacaoId ===
            "preparacao-a"
          ) {
            return preparacaoA;
          }

          if (
            preparacaoId ===
            "preparacao-b"
          ) {
            return preparacaoB;
          }

          if (
            preparacaoId ===
            "preparacao-c"
          ) {
            return preparacaoC;
          }

          return undefined;
        },
      }
    ),
  "Ciclo detectado entre fichas técnicas"
);


console.log(
  "✅ Todos os testes de preparação passaram."
);