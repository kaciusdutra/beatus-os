import {
  prisma,
} from "@/lib/prisma";

import {
  EmpresaContext,
} from "@/core/context/empresaContext";

import {
  FornecedorRepositoryPort,
} from "../fornecedorRepositoryPort";

import {
  Fornecedor,
} from "../../types/fornecedor";

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

function mapearFornecedor(
  fornecedor: {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    cpf: string | null;
    cnpj: string | null;
    telefone: string | null;
    email: string | null;
    observacao: string | null;
    destinoPadrao?: string | null;
    inscricaoEstadual?: string | null;
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    municipio?: string | null;
    uf?: string | null;
    criadoEm: Date;
    atualizadoEm: Date;
    ativo: boolean;
  }
): Fornecedor {
  return {
    id: fornecedor.id,

    razaoSocial:
      fornecedor.razaoSocial,

    nomeFantasia:
      fornecedor.nomeFantasia ??
      undefined,

    cpf:
      fornecedor.cpf ??
      undefined,

    cnpj:
      fornecedor.cnpj ??
      undefined,

    telefone:
      fornecedor.telefone ??
      undefined,

    email:
      fornecedor.email ??
      undefined,

    observacao:
      fornecedor.observacao ??
      undefined,

    destinoPadrao:
      fornecedor.destinoPadrao ??
      undefined,

    inscricaoEstadual:
      fornecedor.inscricaoEstadual ??
      undefined,

    cep:
      fornecedor.cep ??
      undefined,

    logradouro:
      fornecedor.logradouro ??
      undefined,

    numero:
      fornecedor.numero ??
      undefined,

    complemento:
      fornecedor.complemento ??
      undefined,

    bairro:
      fornecedor.bairro ??
      undefined,

    municipio:
      fornecedor.municipio ??
      undefined,

    uf:
      fornecedor.uf ??
      undefined,

    criadoEm:
      fornecedor.criadoEm.toISOString(),

    atualizadoEm:
      fornecedor.atualizadoEm.toISOString(),

    ativo:
      fornecedor.ativo,
  };
}

export class FornecedorRepositoryPostgres
  implements FornecedorRepositoryPort
{
  constructor(
    private readonly contexto:
      EmpresaContext
  ) {}

  async criar(
    fornecedor: Fornecedor
  ): Promise<Fornecedor> {
    const criado =
      await prisma.fornecedor.create({
        data: {
          id:
            fornecedor.id,

          empresaId:
            this.contexto.empresaId,

          razaoSocial:
            fornecedor.razaoSocial,

          nomeFantasia:
            fornecedor.nomeFantasia ??
            null,

          cpf:
            fornecedor.cpf
              ? normalizarCpf(
                  fornecedor.cpf
                )
              : null,

          cnpj:
            fornecedor.cnpj
              ? normalizarCnpj(
                  fornecedor.cnpj
                )
              : null,

          telefone:
            fornecedor.telefone ??
            null,

          email:
            fornecedor.email ??
            null,

          observacao:
            fornecedor.observacao ??
            null,

          destinoPadrao:
            fornecedor.destinoPadrao ??
            null,

          inscricaoEstadual:
            fornecedor.inscricaoEstadual ??
            null,

          cep:
            fornecedor.cep ??
            null,

          logradouro:
            fornecedor.logradouro ??
            null,

          numero:
            fornecedor.numero ??
            null,

          complemento:
            fornecedor.complemento ??
            null,

          bairro:
            fornecedor.bairro ??
            null,

          municipio:
            fornecedor.municipio ??
            null,

          uf:
            fornecedor.uf ??
            null,

          ativo:
            fornecedor.ativo,

          criadoEm:
            new Date(
              fornecedor.criadoEm
            ),

          atualizadoEm:
            new Date(
              fornecedor.atualizadoEm
            ),
        },
      });

    return mapearFornecedor(
      criado
    );
  }

  async buscarPorId(
    id: string
  ): Promise<
    Fornecedor | undefined
  > {
    const fornecedor =
      await prisma.fornecedor.findFirst({
        where: {
          id,

          empresaId:
            this.contexto.empresaId,
        },
      });

    return fornecedor
      ? mapearFornecedor(
          fornecedor
        )
      : undefined;
  }

  async buscarPorCnpj(
    cnpj: string
  ): Promise<
    Fornecedor | undefined
  > {
    const fornecedor =
      await prisma.fornecedor.findFirst({
        where: {
          empresaId:
            this.contexto.empresaId,

          cnpj:
            normalizarCnpj(
              cnpj
            ),
        },
      });

    return fornecedor
      ? mapearFornecedor(
          fornecedor
        )
      : undefined;
  }

  async buscarPorCpf(
    cpf: string
  ): Promise<
    Fornecedor | undefined
  > {
    const fornecedor =
      await prisma.fornecedor.findFirst({
        where: {
          empresaId:
            this.contexto.empresaId,

          cpf:
            normalizarCpf(
              cpf
            ),
        },
      });

    return fornecedor
      ? mapearFornecedor(
          fornecedor
        )
      : undefined;
  }

  async listar(): Promise<
    Fornecedor[]
  > {
    const fornecedores =
      await prisma.fornecedor.findMany({
        where: {
          empresaId:
            this.contexto.empresaId,
        },

        orderBy: {
          razaoSocial:
            "asc",
        },
      });

    return fornecedores.map(
      mapearFornecedor
    );
  }

  async atualizar(
    fornecedor: Fornecedor
  ): Promise<Fornecedor> {
    const existente =
      await prisma.fornecedor.findFirst({
        where: {
          id:
            fornecedor.id,

          empresaId:
            this.contexto.empresaId,
        },
      });

    if (!existente) {
      throw new Error(
        "Fornecedor não encontrado."
      );
    }

    const atualizado =
      await prisma.fornecedor.update({
        where: {
          id:
            fornecedor.id,
        },

        data: {
          razaoSocial:
            fornecedor.razaoSocial,

          nomeFantasia:
            fornecedor.nomeFantasia ??
            null,

          cpf:
            fornecedor.cpf
              ? normalizarCpf(
                  fornecedor.cpf
                )
              : null,

          cnpj:
            fornecedor.cnpj
              ? normalizarCnpj(
                  fornecedor.cnpj
                )
              : null,

          telefone:
            fornecedor.telefone ??
            null,

          email:
            fornecedor.email ??
            null,

          observacao:
            fornecedor.observacao ??
            null,

          destinoPadrao:
            fornecedor.destinoPadrao ??
            null,

          inscricaoEstadual:
            fornecedor.inscricaoEstadual ??
            null,

          cep:
            fornecedor.cep ??
            null,

          logradouro:
            fornecedor.logradouro ??
            null,

          numero:
            fornecedor.numero ??
            null,

          complemento:
            fornecedor.complemento ??
            null,

          bairro:
            fornecedor.bairro ??
            null,

          municipio:
            fornecedor.municipio ??
            null,

          uf:
            fornecedor.uf ??
            null,

          ativo:
            fornecedor.ativo,
        },
      });

    return mapearFornecedor(
      atualizado
    );
  }

  async remover(
    id: string
  ): Promise<void> {
    const existente =
      await prisma.fornecedor.findFirst({
        where: {
          id,

          empresaId:
            this.contexto.empresaId,
        },
      });

    if (!existente) {
      throw new Error(
        "Fornecedor não encontrado."
      );
    }

    await prisma.fornecedor.delete({
      where: {
        id,
      },
    });
  }
}