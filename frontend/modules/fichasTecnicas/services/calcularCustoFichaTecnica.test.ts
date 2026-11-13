import {
  calcularCustoFichaTecnica,
  type ContextoCustoFicha,
  type DadosInsumoCusto,
} from "./calcularCustoFichaTecnica";

import {
  FichaTecnica,
  FichaTecnicaItem,
} from "../types/fichaTecnica";

let verificacoes = 0;

function verificar(
  condicao: boolean,
  mensagem: string
): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function perto(
  recebido: number | null | undefined,
  esperado: number,
  nome: string
): void {
  verificacoes++;

  if (
    recebido === null ||
    recebido === undefined ||
    Math.abs(recebido - esperado) > 0.0001
  ) {
    throw new Error(
      `Falha em ${nome}: esperado ${esperado}, recebido ${recebido}`
    );
  }
}

const INSUMOS: DadosInsumoCusto[] = [
  {
    id: "peito",
    nome: "Peito bovino",
    quantidadeCompra: 1,
    precoCompra: 35,
    unidadeCompra: "kg",
    perdaLimpeza: 0,
    embalagem: false,
  },
  {
    id: "linguica",
    nome: "Linguiça suína",
    quantidadeCompra: 1,
    precoCompra: 22,
    unidadeCompra: "kg",
    perdaLimpeza: 0,
    embalagem: false,
  },
  {
    // 6 pacotes por R$ 11, cada pacote com 6 un.
    id: "pao",
    nome: "Pão brioche",
    quantidadeCompra: 6,
    precoCompra: 11,
    unidadeCompra: "pct",
    equivalenciaQuantidade: 6,
    equivalenciaUnidade: "un",
    perdaLimpeza: 0,
    embalagem: false,
  },
  {
    // Maço de 150 g por R$ 7,90.
    id: "rucula",
    nome: "Rúcula",
    quantidadeCompra: 1,
    precoCompra: 7.9,
    unidadeCompra: "un",
    equivalenciaQuantidade: 150,
    equivalenciaUnidade: "g",
    perdaLimpeza: 0,
    embalagem: false,
  },
  {
    id: "hamburgueira",
    nome: "Hamburgueira G",
    quantidadeCompra: 1000,
    precoCompra: 1410,
    unidadeCompra: "un",
    perdaLimpeza: 0,
    embalagem: true,
  },
  {
    id: "refri",
    nome: "Refrigerante lata",
    quantidadeCompra: 1,
    precoCompra: 3,
    unidadeCompra: "un",
    perdaLimpeza: 0,
    embalagem: false,
  },
];

function item(
  id: string,
  tipo: "INSUMO" | "PREPARACAO",
  referencia: string,
  quantidade: number,
  unidade: string,
  perda = 0
): FichaTecnicaItem {
  return {
    id,
    tipo,
    insumoId: tipo === "INSUMO" ? referencia : undefined,
    preparacaoId:
      tipo === "PREPARACAO" ? referencia : undefined,
    quantidade,
    unidade,
    percentualPerda: perda,
    custoCalculado: 0,
  };
}

function ficha(
  id: string,
  nome: string,
  tipo: "PRODUTO" | "PREPARACAO",
  itens: FichaTecnicaItem[],
  extras?: Partial<FichaTecnica>
): FichaTecnica {
  return {
    id,
    nome,
    tipo,
    produtoId: tipo === "PRODUTO" ? `produto-${id}` : undefined,
    embalagem: 0,
    ativo: true,
    itens,
    criadoEm: "2026-11-12T00:00:00.000Z",
    atualizadoEm: "2026-11-12T00:00:00.000Z",
    ...extras,
  };
}

function montarContexto(
  fichas: FichaTecnica[]
): ContextoCustoFicha {
  return {
    buscarInsumo: (id) =>
      INSUMOS.find((insumo) => insumo.id === id),
    buscarFicha: (id) =>
      fichas.find((f) => f.id === id),
  };
}

function executarTestes(): void {
  // --------------------------------------------------
  // Blend: 112 g de peito + 48 g de linguiça = 160 g
  // --------------------------------------------------
  const blend = ficha(
    "blend",
    "Blend 160 g",
    "PREPARACAO",
    [
      item("b1", "INSUMO", "peito", 112, "g"),
      item("b2", "INSUMO", "linguica", 48, "g"),
    ],
    { rendimento: 160, unidadeRendimento: "g" }
  );

  // --------------------------------------------------
  // Agnus: blend (em kg!), pão, rúcula e hamburgueira
  // --------------------------------------------------
  const agnus = ficha("agnus", "Agnus", "PRODUTO", [
    item("a1", "PREPARACAO", "blend", 0.16, "kg"),
    item("a2", "INSUMO", "pao", 1, "un"),
    item("a3", "INSUMO", "rucula", 10, "g"),
    item("a4", "INSUMO", "hamburgueira", 1, "un"),
  ]);

  const contexto = montarContexto([blend, agnus]);

  const custoBlend = calcularCustoFichaTecnica(
    blend,
    contexto
  );

  verificar(custoBlend.completo, "blend completo");
  perto(custoBlend.custoTotal, 4.976, "custo do blend");
  perto(
    custoBlend.custoPorUnidade,
    4.976 / 160,
    "custo do blend por grama"
  );
  verificar(
    custoBlend.unidadeRendimento === "g",
    "unidade do rendimento"
  );

  const custoAgnus = calcularCustoFichaTecnica(
    agnus,
    contexto
  );

  verificar(custoAgnus.completo, "Agnus completo");

  // Blend em kg dentro de uma ficha que rende em g: 0,16 kg = 160 g.
  perto(
    custoAgnus.itens[0].custo,
    4.976,
    "blend usado em kg dentro do Agnus"
  );
  perto(
    custoAgnus.itens[0].custoPorUnidade,
    4.976 / 160,
    "custo por unidade do blend na linha"
  );
  verificar(
    custoAgnus.itens[0].unidadeReferencia === "g",
    "unidade de referência do blend"
  );

  perto(custoAgnus.itens[1].custo, 11 / 6 / 6, "pão");
  perto(
    custoAgnus.itens[2].custo,
    (10 / 150) * 7.9,
    "rúcula"
  );

  verificar(
    custoAgnus.itens[3].embalagem,
    "hamburgueira é embalagem"
  );

  const receita = 4.976 + 11 / 6 / 6 + (10 / 150) * 7.9;

  perto(custoAgnus.custoReceita, receita, "custo da receita");
  perto(
    custoAgnus.custoEmbalagemItens,
    1.41,
    "custo da embalagem"
  );
  perto(
    custoAgnus.custoTotal,
    receita + 1.41,
    "custo total do Agnus"
  );

  // --------------------------------------------------
  // Combo: Agnus (ficha de produto) + refrigerante
  // --------------------------------------------------
  const combo = ficha("combo", "Combo Agnus", "PRODUTO", [
    item("c1", "PREPARACAO", "agnus", 1, "un"),
    item("c2", "INSUMO", "refri", 1, "un"),
  ]);

  const custoCombo = calcularCustoFichaTecnica(
    combo,
    montarContexto([blend, agnus, combo])
  );

  verificar(custoCombo.completo, "combo completo");
  perto(
    custoCombo.custoTotal,
    receita + 1.41 + 3,
    "combo = Agnus + refrigerante"
  );

  // --------------------------------------------------
  // Perda de cocção ao usar uma ficha: custo ÷ aproveitamento
  // --------------------------------------------------
  const comPerda = ficha("perda", "Teste perda", "PRODUTO", [
    item("p1", "PREPARACAO", "blend", 160, "g", 20),
  ]);

  perto(
    calcularCustoFichaTecnica(
      comPerda,
      montarContexto([blend, comPerda])
    ).custoTotal,
    4.976 / 0.8,
    "perda de 20% em item que é ficha"
  );

  // --------------------------------------------------
  // Embalagem fixa da ficha entra no total
  // --------------------------------------------------
  const comFixa = ficha(
    "fixa",
    "Teste fixa",
    "PRODUTO",
    [item("f1", "INSUMO", "refri", 1, "un")],
    { embalagem: 0.5 }
  );

  perto(
    calcularCustoFichaTecnica(
      comFixa,
      montarContexto([comFixa])
    ).custoTotal,
    3.5,
    "embalagem fixa"
  );

  // --------------------------------------------------
  // Pendências: o resto continua calculado e a mensagem aparece
  // --------------------------------------------------
  const semConversao = ficha("sc", "Sem conversão", "PRODUTO", [
    item("s1", "INSUMO", "peito", 100, "g"),
    item("s2", "INSUMO", "pao", 1, "g"),
  ]);

  const resultadoSc = calcularCustoFichaTecnica(
    semConversao,
    montarContexto([semConversao])
  );

  verificar(!resultadoSc.completo, "ficha com pendência não é completa");
  perto(resultadoSc.itens[0].custo, 3.5, "item bom continua calculado");
  verificar(
    resultadoSc.itens[1].custo === null &&
      Boolean(resultadoSc.itens[1].erro?.includes("equivalência")),
    "mensagem orienta a equivalência"
  );
  perto(resultadoSc.custoTotal, 3.5, "total soma só o que foi calculado");

  const insumoSumido = ficha("is", "Insumo sumido", "PRODUTO", [
    item("i1", "INSUMO", "nao-existe", 1, "un"),
  ]);

  verificar(
    !calcularCustoFichaTecnica(
      insumoSumido,
      montarContexto([insumoSumido])
    ).completo,
    "insumo inexistente"
  );

  // Preparação sem rendimento
  const semRendimento = ficha("sr", "Sem rendimento", "PREPARACAO", [
    item("r1", "INSUMO", "peito", 100, "g"),
  ]);

  const usaSemRendimento = ficha("us", "Usa sem rendimento", "PRODUTO", [
    item("u1", "PREPARACAO", "sr", 50, "g"),
  ]);

  const resultadoSr = calcularCustoFichaTecnica(
    usaSemRendimento,
    montarContexto([semRendimento, usaSemRendimento])
  );

  verificar(
    !resultadoSr.completo &&
      Boolean(resultadoSr.itens[0].erro?.includes("rendimento")),
    "preparação sem rendimento"
  );

  // Unidade incompatível entre as fichas (pct para uma ficha que rende em g)
  const unidadeErrada = ficha("ue", "Unidade errada", "PRODUTO", [
    item("e1", "PREPARACAO", "blend", 1, "un"),
  ]);

  verificar(
    Boolean(
      calcularCustoFichaTecnica(
        unidadeErrada,
        montarContexto([blend, unidadeErrada])
      ).itens[0].erro?.includes("Não é possível converter")
    ),
    "unidade incompatível entre fichas"
  );

  // Ciclo: A usa B e B usa A
  const a = ficha(
    "ciclo-a",
    "A",
    "PREPARACAO",
    [item("x1", "PREPARACAO", "ciclo-b", 10, "g")],
    { rendimento: 100, unidadeRendimento: "g" }
  );

  const b = ficha(
    "ciclo-b",
    "B",
    "PREPARACAO",
    [item("y1", "PREPARACAO", "ciclo-a", 10, "g")],
    { rendimento: 100, unidadeRendimento: "g" }
  );

  const resultadoCiclo = calcularCustoFichaTecnica(
    a,
    montarContexto([a, b])
  );

  verificar(
    !resultadoCiclo.completo,
    "ciclo entre fichas é detectado sem travar"
  );

  // --------------------------------------------------
  // Grupo de escolha (bloco 8I): o custo usa a opção mais cara
  // --------------------------------------------------
  // peito R$ 35/kg e linguiça R$ 22/kg: 100 g de cada = R$ 3,50 e R$ 2,20
  const opcaoA = item("g1", "INSUMO", "peito", 100, "g");

  const opcaoB = item("g2", "INSUMO", "linguica", 100, "g");

  opcaoA.grupoEscolha = "acompanhamento";

  opcaoB.grupoEscolha = "acompanhamento";

  const comboEscolha = ficha("comboEscolha-escolha", "Combo com escolha", "PRODUTO", [
    opcaoA,
    opcaoB,
    item("g3", "INSUMO", "pao", 1, "un"),
  ]);

  const resultadoCombo = calcularCustoFichaTecnica(
    comboEscolha,
    montarContexto([comboEscolha])
  );

  // pão R$ 11 / 36 un = R$ 0,3056; entra a opção mais cara (R$ 3,50)
  perto(resultadoCombo.custoTotal, 3.5 + 11 / 36, "comboEscolha: só a opção mais cara conta");

  verificar(
    resultadoCombo.itens.find((i) => i.itemId === "g1")?.contaNoCusto === true &&
      resultadoCombo.itens.find((i) => i.itemId === "g2")?.contaNoCusto === false,
    "a opção mais barata não conta no custo"
  );

  // Sem grupo, tudo soma
  const semGrupo = ficha("comboEscolha-soma", "Combo sem escolha", "PRODUTO", [
    item("h1", "INSUMO", "peito", 100, "g"),
    item("h2", "INSUMO", "linguica", 100, "g"),
  ]);

  perto(
    calcularCustoFichaTecnica(semGrupo, montarContexto([semGrupo])).custoTotal,
    3.5 + 2.2,
    "sem grupo, os itens somam"
  );

  console.log(
    `✅ Testes do motor de custo das fichas passaram (${verificacoes} verificações).`
  );
}

try {
  executarTestes();
} catch (error) {
  console.error("❌ Testes do motor de custo das fichas falharam:");
  console.error(error);
  process.exitCode = 1;
}
