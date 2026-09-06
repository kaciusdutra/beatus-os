export interface FichaTecnicaItem {
  id: string;

  tipo: "INSUMO" | "PREPARACAO";

  insumoId?: string;

  preparacaoId?: string;

  quantidade: number;

  unidade: string;

  percentualPerda: number;

  custoCalculado: number;

  observacao?: string;
}

export interface FichaTecnica {
  id: string;

  tipo: "PRODUTO" | "PREPARACAO";

  produtoId?: string;

  nome: string;

  rendimento?: number;

  unidadeRendimento?: string;

  embalagem: number;

  ativo: boolean;

  itens: FichaTecnicaItem[];

  criadoEm: string;

  atualizadoEm: string;
}