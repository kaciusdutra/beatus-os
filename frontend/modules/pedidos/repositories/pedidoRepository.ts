import {
  Repository,
} from "@/core/persistence/Repository";

import {
  InMemoryStore,
} from "@/core/persistence/InMemoryStore";

import {
  TransactionResource,
} from "@/core/persistence/Transaction";

import {
  Pedido,
} from "../types/pedido";

class PedidoRepositoryInMemory
  implements
    Repository<Pedido>,
    TransactionResource
{
  private store =
    new InMemoryStore<Pedido>();

  async criar(
    pedido: Pedido
  ): Promise<Pedido> {
    return this.store.criar(
      pedido
    );
  }

  async buscarPorId(
    id: string
  ): Promise<Pedido | undefined> {
    return this.store.buscarPorId(
      id
    );
  }

  async listar(): Promise<
    Pedido[]
  > {
    return this.store.listar();
  }

  async atualizar(
    pedido: Pedido
  ): Promise<Pedido> {
    return this.store.atualizar(
      pedido
    );
  }

  async remover(
    id: string
  ): Promise<void> {
    this.store.remover(id);
  }

  async buscarPorCliente(
    clienteId: string
  ): Promise<Pedido[]> {
    const pedidos =
      this.store.listar();

    return pedidos.filter(
      (pedido) =>
        pedido.cliente
          .clienteId ===
        clienteId
    );
  }

  criarSnapshot(): unknown {
    return this.store.criarSnapshot();
  }

  restaurarSnapshot(
    snapshot: unknown
  ): void {
    this.store.restaurarSnapshot(
      snapshot as Pedido[]
    );
  }
}

let repository:
  PedidoRepositoryInMemory | null =
  null;

export function getPedidoRepository(): PedidoRepositoryInMemory {
  if (!repository) {
    repository =
      new PedidoRepositoryInMemory();
  }

  return repository;
}