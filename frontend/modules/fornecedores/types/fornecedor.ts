export interface Fornecedor {
  id: string;

  razaoSocial: string;

  nomeFantasia?: string;

  cpf?: string;

  cnpj?: string;

  telefone?: string;

  email?: string;

  observacao?: string;

  criadoEm: string;

  atualizadoEm: string;

  ativo: boolean;
}