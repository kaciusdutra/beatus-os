import {
  Cliente,
} from "../types/cliente";

export interface ClienteRepositoryPort {
  criar(
    cliente: Cliente
  ): Promise<Cliente>;

  buscarPorId(
    id: string
  ): Promise<
    Cliente | undefined
  >;

  buscarPorTelefone(
    telefone: string
  ): Promise<
    Cliente | undefined
  >;
    buscarPorCpf(
    cpf: string
  ): Promise<
    Cliente | undefined
  >;

  listar(): Promise<Cliente[]>;

  atualizar(
    cliente: Cliente
  ): Promise<Cliente>;

  remover(
    id: string
  ): Promise<void>;
}