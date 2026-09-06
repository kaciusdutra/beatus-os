import { EntradaCompra } from "../types/entradaCompra";
import { EntradaCompraDocumento } from "../types/entradaCompraDocumento";

export interface EntradaCompraRepositoryPort {
  criar(entrada: EntradaCompra): Promise<EntradaCompra>;

  buscarPorId(id: string): Promise<EntradaCompra | undefined>;

  listar(): Promise<EntradaCompra[]>;

  atualizar(entrada: EntradaCompra): Promise<EntradaCompra>;

  remover(id: string): Promise<void>;

  adicionarDocumento(
    documento: EntradaCompraDocumento
  ): Promise<EntradaCompraDocumento>;

  removerDocumento(id: string): Promise<void>;
}