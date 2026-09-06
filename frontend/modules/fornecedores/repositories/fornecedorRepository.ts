import {
  InMemoryStore,
} from "@/core/persistence/InMemoryStore";

import {
  TransactionResource,
} from "@/core/persistence/Transaction";

import {
  FornecedorRepositoryPort,
} from "./fornecedorRepositoryPort";

import {
  Fornecedor,
} from "../types/fornecedor";

function normalizarCpf(
  cpf: string
): string {
  return cpf.replace(
    /\D/g,
    ""
  );
}

function normalizarCnpj(
  cnpj: string
): string {
  return cnpj.replace(
    /\D/g,
    ""
  );
}

class FornecedorRepositoryInMemory
  implements
    FornecedorRepositoryPort,
    TransactionResource
{
  private store =
    new InMemoryStore<Fornecedor>();

  async criar(
    fornecedor: Fornecedor
  ): Promise<Fornecedor> {
    return this.store.criar(
      fornecedor
    );
  }

  async buscarPorId(
    id: string
  ): Promise<
    Fornecedor | undefined
  > {
    return this.store.buscarPorId(
      id
    );
  }

  async buscarPorCnpj(
    cnpj: string
  ): Promise<
    Fornecedor | undefined
  > {
    const cnpjNormalizado =
      normalizarCnpj(
        cnpj
      );

    return this.store
      .listar()
      .find(
        (fornecedor) =>
          fornecedor.cnpj &&
          normalizarCnpj(
            fornecedor.cnpj
          ) ===
            cnpjNormalizado
      );
  }

  async buscarPorCpf(
    cpf: string
  ): Promise<
    Fornecedor | undefined
  > {
    const cpfNormalizado =
      normalizarCpf(
        cpf
      );

    return this.store
      .listar()
      .find(
        (fornecedor) =>
          fornecedor.cpf &&
          normalizarCpf(
            fornecedor.cpf
          ) ===
            cpfNormalizado
      );
  }

  async listar(): Promise<
    Fornecedor[]
  > {
    return this.store.listar();
  }

  async atualizar(
    fornecedor: Fornecedor
  ): Promise<Fornecedor> {
    return this.store.atualizar(
      fornecedor
    );
  }

  async remover(
    id: string
  ): Promise<void> {
    this.store.remover(id);
  }

  criarSnapshot(): unknown {
    return this.store.criarSnapshot();
  }

  restaurarSnapshot(
    snapshot: unknown
  ): void {
    this.store.restaurarSnapshot(
      snapshot as Fornecedor[]
    );
  }
}

let repository:
  FornecedorRepositoryInMemory | null =
  null;

export function getFornecedorRepository(): FornecedorRepositoryInMemory {
  if (!repository) {
    repository =
      new FornecedorRepositoryInMemory();
  }

  return repository;
}