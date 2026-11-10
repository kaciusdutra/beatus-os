export interface Fornecedor {
  id: string;

  razaoSocial: string;

  nomeFantasia?: string;

  cpf?: string;

  cnpj?: string;

  telefone?: string;

  email?: string;

  observacao?: string;

  // Destino sugerido para os itens de compra deste fornecedor; opcional (bloco 7C).
  destinoPadrao?: string;

  criadoEm: string;

  atualizadoEm: string;

  ativo: boolean;
}