import {
  InMemoryStore,
} from "@/core/persistence/InMemoryStore";

import {
  TransactionResource,
} from "@/core/persistence/Transaction";

import {
  ClienteRepositoryPort,
} from "./clienteRepositoryPort";

import {
  Cliente,
} from "../types/cliente";

function normalizarTelefone(
  telefone: string
): string {
  return telefone.replace(
    /\D/g,
    ""
  );
}

function normalizarCpf(
  cpf: string
): string {
  return cpf.replace(
    /\D/g,
    ""
  );
}

class ClienteRepositoryInMemory
  implements
    ClienteRepositoryPort,
    TransactionResource
{
  private store =
    new InMemoryStore<Cliente>();

  async criar(
    cliente: Cliente
  ): Promise<Cliente> {
    return this.store.criar(
      cliente
    );
  }

  async buscarPorId(
    id: string
  ): Promise<
    Cliente | undefined
  > {
    return this.store.buscarPorId(
      id
    );
  }

  async listar(): Promise<
    Cliente[]
  > {
    return this.store.listar();
  }

  async atualizar(
    cliente: Cliente
  ): Promise<Cliente> {
    return this.store.atualizar(
      cliente
    );
  }

  async remover(
    id: string
  ): Promise<void> {
    this.store.remover(id);
  }

  async buscarPorTelefone(
    telefone: string
  ): Promise<
    Cliente | undefined
  > {
    const telefoneNormalizado =
      normalizarTelefone(
        telefone
      );

    return this.store
      .listar()
      .find(
        (cliente) =>
          normalizarTelefone(
            cliente.telefone
          ) ===
          telefoneNormalizado
      );
  }

  async buscarPorCpf(
    cpf: string
  ): Promise<
    Cliente | undefined
  > {
    const cpfNormalizado =
      normalizarCpf(
        cpf
      );

    return this.store
      .listar()
      .find(
        (cliente) =>
          normalizarCpf(
            cliente.cpf
          ) ===
          cpfNormalizado
      );
  }

  criarSnapshot(): unknown {
    return this.store.criarSnapshot();
  }

  restaurarSnapshot(
    snapshot: unknown
  ): void {
    this.store.restaurarSnapshot(
      snapshot as Cliente[]
    );
  }
}

let repository:
  ClienteRepositoryInMemory | null =
  null;

export function getClienteRepository(): ClienteRepositoryInMemory {
  if (!repository) {
    repository =
      new ClienteRepositoryInMemory();
  }

  return repository;
}