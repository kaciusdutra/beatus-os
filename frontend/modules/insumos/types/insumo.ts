export interface Insumo {
  id: string;

  nome: string;

  categoriaId: string;
  
  unidadeCompraId: string;
  // Sigla da unidade de compra (ex.: kg), preenchida na leitura (bloco 8C).
  unidadeCompraAbreviacao?: string;
  
  quantidadeCompra: number;
  precoCompra: number;
  custoUnitario: number;
  // Equivalência da unidade de compra em outra unidade de uso (bloco 8B).
  // Exemplos: 1 pct = 6 un; 1 maço = 150 g; 1 frasco = 300 pump.
  equivalenciaQuantidade?: number;
  equivalenciaUnidade?: string;
  // Perda de limpeza (casca, osso, aparas), em %.
  perdaLimpeza: number;

  fornecedorId?: string;

  ativo: boolean;

  observacao?: string;

  criadoEm: string;
  atualizadoEm: string;
}