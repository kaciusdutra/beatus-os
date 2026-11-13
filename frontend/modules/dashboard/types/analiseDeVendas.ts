export type EtiquetaDoProduto = "MAIS_VENDIDO" | "REVER_MARGEM" | "DIVULGAR";

export interface VendaDoProdutoNoCanal {
  canal: string;
  unidades: number;
  valor: number;
  // Margem líquida (%) do preço praticado neste canal, quando a Precificação a registrou.
  margemPercentual?: number;
}

export interface ProdutoAnalisado {
  produtoId: string;
  nome: string;
  unidades: number;
  valor: number;
  porCanal: VendaDoProdutoNoCanal[];
  etiquetas: EtiquetaDoProduto[];
  // Por que cada etiqueta foi dada, em linguagem simples.
  motivos: string[];
}

export interface CanalAnalisado {
  canal: string;
  pedidos: number;
  valor: number;
  ticketMedio: number;
  // % do faturamento do período
  percentual: number;
}

export interface AnaliseDeVendas {
  de: string;
  ate: string;
  dias: number;
  pedidos: number;
  faturamento: number;
  canais: CanalAnalisado[];
  produtos: ProdutoAnalisado[];
  margemMinimaPercentual: number;
  // Pontos acima da margem mínima para um produto ser candidato a divulgação.
  folgaParaDivulgar: number;
}

export interface MargemDoPreco {
  produtoId: string;
  canal: string;
  margemPercentual?: number;
}
