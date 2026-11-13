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
  // Posição do item na ficha (a ordem em que foi digitado).
  ordem?: number;
  // Itens com o mesmo nome de grupo são opções (o cliente escolhe uma);
  // o custo usa a mais cara (bloco 8I).
  grupoEscolha?: string;
}

export interface FichaTecnica {
  id: string;

  tipo: "PRODUTO" | "PREPARACAO";

  produtoId?: string;

  nome: string;

  rendimento?: number;

  unidadeRendimento?: string;

  embalagem: number;
  // O que o funcionário lê na cozinha (bloco 8E). Um passo por linha.
  modoPreparo?: string;
  montagem?: string;
  observacoes?: string;
  // Quanto dura depois de pronta, em dias.
  validadeDias?: number;
  tempoPreparoMin?: number;
  // Porção padrão (ex.: 30 g de molho por burger).
  porcaoQuantidade?: number;
  porcaoUnidade?: string;
  ativo: boolean;

  itens: FichaTecnicaItem[];

  criadoEm: string;

  atualizadoEm: string;
}