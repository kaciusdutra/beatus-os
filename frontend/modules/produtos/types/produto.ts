// Categorias dos produtos acabados (regra 6.4) e do combo.
export const CATEGORIAS_PRODUTO = [
  "HAMBÚRGUER",
  "ACOMPANHAMENTO",
  "SOBREMESA",
  "BEBIDA",
  "COMBO",
] as const;

export type CategoriaProduto =
  (typeof CATEGORIAS_PRODUTO)[number];

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  // O preço de venda vem da precificação (regra 6.6); o produto nasce com 0.
  preco: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}
