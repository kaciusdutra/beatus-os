import {
  Fornecedor,
} from "../types/fornecedor";

export interface FornecedorRepositoryPort {
  criar(
    fornecedor: Fornecedor
  ): Promise<Fornecedor>;

  buscarPorId(
    id: string
  ): Promise<
    Fornecedor | undefined
  >;

  buscarPorCnpj(
    cnpj: string
  ): Promise<
    Fornecedor | undefined
  >;

  buscarPorCpf(
    cpf: string
  ): Promise<
    Fornecedor | undefined
  >;

  listar(): Promise<Fornecedor[]>;

  atualizar(
    fornecedor: Fornecedor
  ): Promise<Fornecedor>;

  remover(
    id: string
  ): Promise<void>;
}