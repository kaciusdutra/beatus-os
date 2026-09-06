import {
  Fornecedor,
} from "../types/fornecedor";

import {
  FornecedorRepositoryPort,
} from "../repositories/fornecedorRepositoryPort";

import {
  getFornecedorRepository,
} from "../repositories/fornecedorRepository";

export interface CriarFornecedorInput {
  fornecedor: Fornecedor;
}

export interface AtualizarFornecedorInput {
  fornecedor: Fornecedor;
}

function normalizarCpf(
  cpf?: string
): string | undefined {
  if (!cpf) {
    return undefined;
  }

  const normalizado = cpf.replace(
    /\D/g,
    ""
  );

  return normalizado || undefined;
}

function normalizarCnpj(
  cnpj?: string
): string | undefined {
  if (!cnpj) {
    return undefined;
  }

  const normalizado = cnpj.replace(
    /\D/g,
    ""
  );

  return normalizado || undefined;
}

export class FornecedorService {
  constructor(
    private readonly repository:
      FornecedorRepositoryPort
  ) {}

  async buscarPorId(
    fornecedorId: string
  ): Promise<
    Fornecedor | undefined
  > {
    return this.repository.buscarPorId(
      fornecedorId
    );
  }

  async buscarPorCpf(
    cpf: string
  ): Promise<
    Fornecedor | undefined
  > {
    return this.repository.buscarPorCpf(
      cpf
    );
  }

  async buscarPorCnpj(
    cnpj: string
  ): Promise<
    Fornecedor | undefined
  > {
    return this.repository.buscarPorCnpj(
      cnpj
    );
  }

  async listar(): Promise<Fornecedor[]> {
    return this.repository.listar();
  }

  async criarFornecedor(
    input: CriarFornecedorInput
  ): Promise<Fornecedor> {
    const cpf =
      normalizarCpf(
        input.fornecedor.cpf
      );

    const cnpj =
      normalizarCnpj(
        input.fornecedor.cnpj
      );

    if (!cpf && !cnpj) {
      throw new Error(
        "Informe CPF ou CNPJ do fornecedor."
      );
    }

    if (cpf && cnpj) {
      throw new Error(
        "Informe apenas CPF ou CNPJ do fornecedor."
      );
    }

    if (cpf) {
      const existente =
        await this.repository.buscarPorCpf(
          cpf
        );

      if (existente) {
        throw new Error(
          "Já existe um fornecedor cadastrado com este CPF."
        );
      }
    }

    if (cnpj) {
      const existente =
        await this.repository.buscarPorCnpj(
          cnpj
        );

      if (existente) {
        throw new Error(
          "Já existe um fornecedor cadastrado com este CNPJ."
        );
      }
    }

    const fornecedor: Fornecedor = {
      ...input.fornecedor,

      cpf,

      cnpj,
    };

    return this.repository.criar(
      fornecedor
    );
  }

  async atualizarFornecedor(
    input: AtualizarFornecedorInput
  ): Promise<Fornecedor> {
    const existente =
      await this.repository.buscarPorId(
        input.fornecedor.id
      );

    if (!existente) {
      throw new Error(
        "Fornecedor não encontrado."
      );
    }

    const cpf =
      normalizarCpf(
        input.fornecedor.cpf
      );

    const cnpj =
      normalizarCnpj(
        input.fornecedor.cnpj
      );

    if (!cpf && !cnpj) {
      throw new Error(
        "Informe CPF ou CNPJ do fornecedor."
      );
    }

    if (cpf && cnpj) {
      throw new Error(
        "Informe apenas CPF ou CNPJ do fornecedor."
      );
    }

    if (
      cpf &&
      cpf !== existente.cpf
    ) {
      const fornecedorComCpf =
        await this.repository.buscarPorCpf(
          cpf
        );

      if (
        fornecedorComCpf &&
        fornecedorComCpf.id !==
          input.fornecedor.id
      ) {
        throw new Error(
          "Já existe um fornecedor cadastrado com este CPF."
        );
      }
    }

    if (
      cnpj &&
      cnpj !== existente.cnpj
    ) {
      const fornecedorComCnpj =
        await this.repository.buscarPorCnpj(
          cnpj
        );

      if (
        fornecedorComCnpj &&
        fornecedorComCnpj.id !==
          input.fornecedor.id
      ) {
        throw new Error(
          "Já existe um fornecedor cadastrado com este CNPJ."
        );
      }
    }

    const fornecedor: Fornecedor = {
      ...input.fornecedor,

      cpf,

      cnpj,
    };

    return this.repository.atualizar(
      fornecedor
    );
  }

    async removerFornecedor(
    fornecedorId: string
  ): Promise<void> {
    const existente =
      await this.repository.buscarPorId(
        fornecedorId
      );

    if (!existente) {
      throw new Error(
        "Fornecedor não encontrado."
      );
    }

    await this.repository.remover(
      fornecedorId
    );
  }
}

let service:
  FornecedorService | null =
  null;

export function getFornecedorService(
  repository?: FornecedorRepositoryPort
): FornecedorService {
  if (!service) {
    service =
      new FornecedorService(
        repository ??
          getFornecedorRepository()
      );
  }

  return service;
}