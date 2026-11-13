import {
  consumoDaFicha,
} from "./calcularConsumo";

import type {
  ContextoCustoFicha,
  DadosInsumoCusto,
} from "@/modules/fichasTecnicas/services/calcularCustoFichaTecnica";

import type {
  FichaTecnica,
  FichaTecnicaItem,
} from "@/modules/fichasTecnicas/types/fichaTecnica";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function perto(valor: number | undefined, esperado: number, nome: string) {
  verificacoes++;

  if (valor === undefined || Math.abs(valor - esperado) > 0.0001) {
    throw new Error(`Falha em ${nome}: esperado ${esperado}, recebido ${valor}`);
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
    id: "abacaxi",
    nome: "Abacaxi",
    quantidadeCompra: 1,
    precoCompra: 5,
    unidadeCompra: "un",
    perdaLimpeza: 50,
    embalagem: false,
  },
  {
    id: "caixa",
    nome: "Caixa",
    quantidadeCompra: 100,
    precoCompra: 120,
    unidadeCompra: "un",
    perdaLimpeza: 0,
    embalagem: true,
  },
];

function item(
  id: string,
  tipo: "INSUMO" | "PREPARACAO",
  referencia: string,
  quantidade: number,
  unidade: string,
  extras: Partial<FichaTecnicaItem> = {}
): FichaTecnicaItem {
  return {
    id,
    tipo,
    insumoId: tipo === "INSUMO" ? referencia : undefined,
    preparacaoId: tipo === "PREPARACAO" ? referencia : undefined,
    quantidade,
    unidade,
    percentualPerda: 0,
    custoCalculado: 0,
    ...extras,
  };
}

function ficha(
  id: string,
  tipo: "PRODUTO" | "PREPARACAO",
  itens: FichaTecnicaItem[],
  extras: Partial<FichaTecnica> = {}
): FichaTecnica {
  return {
    id,
    nome: id,
    tipo,
    produtoId: tipo === "PRODUTO" ? `produto-${id}` : undefined,
    embalagem: 0,
    ativo: true,
    itens,
    criadoEm: "",
    atualizadoEm: "",
    ...extras,
  };
}

function contexto(fichas: FichaTecnica[]): ContextoCustoFicha {
  return {
    buscarInsumo: (id) => INSUMOS.find((i) => i.id === id),
    buscarFicha: (id) => fichas.find((f) => f.id === id),
  };
}

function consumo(r: ReturnType<typeof consumoDaFicha>, id: string) {
  return r.consumos.find((c) => c.id === id);
}

function executarTestes(): void {
  // Blend: 1.000 g de peito cru, rende 800 g (a perda é do rendimento da ficha)
  const blend = ficha(
    "blend",
    "PREPARACAO",
    [item("b1", "INSUMO", "peito", 1000, "g")],
    { rendimento: 800, unidadeRendimento: "g" }
  );

  // Produzir o dobro (2x a receita): sai 2 kg de peito do estoque
  const producao = consumoDaFicha(blend, 2, contexto([blend]));

  perto(consumo(producao, "peito")?.quantidade, 2, "2 kg de peito para 2 receitas");

  verificar(
    consumo(producao, "peito")?.unidade === "kg",
    "o insumo sai na unidade de compra"
  );

  // Burger: 160 g de blend, 1 pão (pacote de 6), 1 caixa
  const burger = ficha("burger", "PRODUTO", [
    item("p1", "PREPARACAO", "blend", 160, "g"),
    item("p2", "INSUMO", "pao", 1, "un"),
    item("p3", "INSUMO", "caixa", 1, "un"),
  ]);

  const venda = consumoDaFicha(burger, 3, contexto([burger, blend]));

  perto(consumo(venda, "blend")?.quantidade, 480, "3 burgers baixam 480 g de blend");

  verificar(
    consumo(venda, "blend")?.itemTipo === "PREPARACAO" &&
      consumo(venda, "peito") === undefined,
    "a venda baixa a preparação, não o peito (sem baixar duas vezes)"
  );

  perto(consumo(venda, "pao")?.quantidade, 0.5, "3 pães = 0,5 pacote");
  perto(consumo(venda, "caixa")?.quantidade, 3, "3 caixas");

  // Perda de limpeza: 1 abacaxi com 50% de perda sai 2 do estoque para render 1
  const prato = ficha("prato", "PRODUTO", [item("a1", "INSUMO", "abacaxi", 1, "un")]);

  perto(
    consumo(consumoDaFicha(prato, 1, contexto([prato])), "abacaxi")?.quantidade,
    2,
    "perda de limpeza aumenta a baixa"
  );

  // Perda de cocção no item: 20% => sai quantidade / 0,8
  const frito = ficha("frito", "PRODUTO", [
    item("f1", "INSUMO", "peito", 100, "g", { percentualPerda: 20 }),
  ]);

  perto(
    consumo(consumoDaFicha(frito, 1, contexto([frito])), "peito")?.quantidade,
    0.125,
    "perda de cocção aumenta a baixa"
  );

  // Combo: produto dentro de produto consome o que o outro produto consome
  const combo = ficha("combo", "PRODUTO", [
    item("c1", "PREPARACAO", "burger", 1, "un"),
    item("c2", "INSUMO", "caixa", 1, "un"),
  ]);

  const comboConsumo = consumoDaFicha(combo, 2, contexto([combo, burger, blend]));

  perto(consumo(comboConsumo, "blend")?.quantidade, 320, "combo x2 baixa 320 g de blend");
  perto(consumo(comboConsumo, "caixa")?.quantidade, 4, "caixas do combo e do burger somam");

  // Opção de escolha: não baixa sozinha, e avisa
  const comEscolha = ficha("escolha", "PRODUTO", [
    item("e1", "INSUMO", "pao", 1, "un", { grupoEscolha: "lado" }),
    item("e2", "INSUMO", "caixa", 1, "un"),
  ]);

  const rEscolha = consumoDaFicha(comEscolha, 1, contexto([comEscolha]));

  verificar(
    consumo(rEscolha, "pao") === undefined &&
      rEscolha.avisos.length === 1 &&
      consumo(rEscolha, "caixa") !== undefined,
    "item com opção de escolha não baixa e gera aviso"
  );

  // Insumo inexistente: aviso, sem quebrar
  const quebrada = ficha("quebrada", "PRODUTO", [item("q1", "INSUMO", "fantasma", 1, "un")]);

  verificar(
    consumoDaFicha(quebrada, 1, contexto([quebrada])).avisos.length === 1,
    "insumo inexistente vira aviso"
  );

  // Ciclo entre fichas não trava
  const a = ficha("ciclo-a", "PRODUTO", [item("x1", "PREPARACAO", "ciclo-b", 1, "un")]);

  const b = ficha("ciclo-b", "PRODUTO", [item("y1", "PREPARACAO", "ciclo-a", 1, "un")]);

  verificar(
    consumoDaFicha(a, 1, contexto([a, b])).avisos.length >= 1,
    "ciclo entre fichas vira aviso"
  );

  console.log(
    `✅ Testes do consumo de estoque passaram (${verificacoes} verificações).`
  );
}

try {
  executarTestes();
} catch (error) {
  console.error("❌ Testes do consumo de estoque falharam:");
  console.error(error);
  process.exitCode = 1;
}
