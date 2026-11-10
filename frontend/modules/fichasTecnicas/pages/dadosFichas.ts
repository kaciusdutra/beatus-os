// Carregamento dos dados das telas de fichas técnicas e montagem do
// contexto de custo (insumos com as unidades e a categoria Embalagens).
// Roda no navegador: o custo é calculado na tela, sempre com os preços atuais.

import {
  type ContextoCustoFicha,
  type DadosInsumoCusto,
} from "../services/calcularCustoFichaTecnica";

import { FichaTecnica } from "../types/fichaTecnica";

export interface InsumoDaTela {
  id: string;
  nome: string;
  categoriaId: string;
  unidadeCompraId: string;
  quantidadeCompra: number;
  precoCompra: number;
  custoUnitario: number;
  equivalenciaQuantidade?: number;
  equivalenciaUnidade?: string;
  perdaLimpeza?: number;
  ativo: boolean;
}

export interface UnidadeDaTela {
  id: string;
  abreviacao: string;
}

export interface CategoriaDaTela {
  id: string;
  nome: string;
}

export interface ProdutoDaTela {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  ativo: boolean;
}

export interface DadosFichas {
  fichas: FichaTecnica[];
  insumos: InsumoDaTela[];
  unidades: UnidadeDaTela[];
  categorias: CategoriaDaTela[];
  produtos: ProdutoDaTela[];
}

// Nome da categoria cujos insumos são embalagem (bloco "Embalagem do produto").
export const CATEGORIA_EMBALAGENS = "Embalagens";

async function buscarJson(
  url: string,
  campo: string
): Promise<unknown[]> {
  const resposta = await fetch(url, {
    cache: "no-store",
  });

  const dados = await resposta.json();

  if (!resposta.ok || dados.sucesso === false) {
    throw new Error(
      dados.mensagem ??
        dados.erro ??
        "Não foi possível carregar os dados."
    );
  }

  return (dados[campo] ?? []) as unknown[];
}

export async function carregarDadosFichas(): Promise<DadosFichas> {
  const [fichas, insumos, unidades, categorias, produtos] =
    await Promise.all([
      buscarJson("/api/fichas", "fichas"),
      buscarJson("/api/insumos", "insumos"),
      buscarJson("/api/insumos/unidades", "unidades"),
      buscarJson("/api/insumos/categorias", "categorias"),
      buscarJson("/api/produtos", "produtos"),
    ]);

  return {
    fichas: fichas as FichaTecnica[],
    insumos: insumos as InsumoDaTela[],
    unidades: unidades as UnidadeDaTela[],
    categorias: categorias as CategoriaDaTela[],
    produtos: produtos as ProdutoDaTela[],
  };
}

export function ehInsumoDeEmbalagem(
  insumo: InsumoDaTela,
  categorias: CategoriaDaTela[]
): boolean {
  return (
    categorias.find(
      (categoria) => categoria.id === insumo.categoriaId
    )?.nome === CATEGORIA_EMBALAGENS
  );
}

export function montarContextoCusto(
  dados: Pick<
    DadosFichas,
    "insumos" | "unidades" | "categorias"
  >,
  fichas: FichaTecnica[]
): ContextoCustoFicha {
  const porId = new Map<string, DadosInsumoCusto>();

  for (const insumo of dados.insumos) {
    porId.set(insumo.id, {
      id: insumo.id,
      nome: insumo.nome,
      quantidadeCompra: insumo.quantidadeCompra,
      precoCompra: insumo.precoCompra,
      unidadeCompra:
        dados.unidades.find(
          (unidade) =>
            unidade.id === insumo.unidadeCompraId
        )?.abreviacao ?? "",
      equivalenciaQuantidade:
        insumo.equivalenciaQuantidade,
      equivalenciaUnidade: insumo.equivalenciaUnidade,
      perdaLimpeza: insumo.perdaLimpeza ?? 0,
      embalagem: ehInsumoDeEmbalagem(
        insumo,
        dados.categorias
      ),
    });
  }

  return {
    buscarInsumo: (id) => porId.get(id),
    buscarFicha: (id) =>
      fichas.find((ficha) => ficha.id === id),
  };
}

// Unidade sugerida para um insumo novo na ficha: kg vira g e L vira ml.
export function unidadeSugeridaDoInsumo(
  insumo: InsumoDaTela,
  unidades: UnidadeDaTela[]
): string {
  const compra =
    unidades.find(
      (unidade) => unidade.id === insumo.unidadeCompraId
    )?.abreviacao ?? "";

  const minuscula = compra.toLowerCase();

  if (minuscula === "kg" || minuscula === "g") {
    return "g";
  }

  if (minuscula === "l" || minuscula === "ml") {
    return "ml";
  }

  return insumo.equivalenciaUnidade ?? compra;
}

export const UNIDADES_DE_USO = [
  "g",
  "kg",
  "ml",
  "L",
  "un",
  "fatia",
  "pump",
  "colher",
];

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Custos pequenos (por grama) precisam de mais casas.
export function formatarCustoFino(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}
