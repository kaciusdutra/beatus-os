export interface Insumo {
  id: string;

  nome: string;

  categoriaId: string;
  
  unidadeCompraId: string;
  
  quantidadeCompra: number;
  precoCompra: number;
  custoUnitario: number;

  fornecedorId?: string;

  ativo: boolean;

  observacao?: string;

  criadoEm: string;
  atualizadoEm: string;
}