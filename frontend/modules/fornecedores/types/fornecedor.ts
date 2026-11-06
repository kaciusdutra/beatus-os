export interface Fornecedor {
  id: string;

  razaoSocial: string;

  nomeFantasia?: string;

  cpf?: string;

  cnpj?: string;

  telefone?: string;

  email?: string;

  observacao?: string;

  // Destino sugerido para os itens de compra deste fornecedor (somente leitura por enquanto).
  destinoPadrao?: string;

  criadoEm: string;

  atualizadoEm: string;

  ativo: boolean;
}