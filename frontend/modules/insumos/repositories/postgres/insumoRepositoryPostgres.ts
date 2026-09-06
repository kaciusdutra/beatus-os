import "server-only";

import { prisma } from "@/lib/prisma";
import type { EmpresaContext } from "@/core/context/empresaContext";

import {
  InsumoRepositoryPort,
} from "../insumoRepositoryPort";

import {
  Insumo,
} from "../../types/insumo";

function mapearInsumo(
  insumo: {
    id: string;
    nome: string;

    categoriaId: string | null;
    unidadeCompraId: string | null;

    quantidadeCompra: unknown;
    precoCompra: unknown;
    custoUnitario: unknown;

    fornecedorId: string | null;

    ativo: boolean;

    observacao: string | null;

    criadoEm: Date;
    atualizadoEm: Date;

    categoriaInsumo: {
  id: string;
  nome: string;
} | null;

unidadeMedida: {
  id: string;
  nome: string;
  abreviacao: string;
} | null;
  }
): Insumo {
  if (
  !insumo.categoriaId ||
  !insumo.unidadeCompraId ||
  !insumo.categoriaInsumo ||
  !insumo.unidadeMedida
) {
  throw new Error(
    "Insumo sem categoria ou unidade de compra vinculada."
  );
}

  return {
    id: insumo.id,

    nome: insumo.nome,

    categoriaId:
      insumo.categoriaId,

    unidadeCompraId:
      insumo.unidadeCompraId,

    quantidadeCompra:
      Number(insumo.quantidadeCompra),

    precoCompra:
      Number(insumo.precoCompra),

    custoUnitario:
      Number(insumo.custoUnitario),

    fornecedorId:
      insumo.fornecedorId ??
      undefined,

    ativo:
      insumo.ativo,

    observacao:
      insumo.observacao ??
      undefined,

    criadoEm:
      insumo.criadoEm.toISOString(),

    atualizadoEm:
      insumo.atualizadoEm.toISOString(),
  };
}

export class InsumoRepositoryPostgres
  implements InsumoRepositoryPort
{
  constructor(
    private readonly contexto: EmpresaContext
  ) {}

  async criar(
    insumo: Insumo
  ): Promise<Insumo> {
    const criado =
      await prisma.insumo.create({
        data: {
          id: insumo.id,

          empresaId:
            this.contexto.empresaId,

          nome: insumo.nome,

          categoriaId:
            insumo.categoriaId,

          unidadeCompraId:
            insumo.unidadeCompraId,

          quantidadeCompra:
            insumo.quantidadeCompra,

          precoCompra:
            insumo.precoCompra,

          custoUnitario:
            insumo.custoUnitario,

          fornecedorId:
            insumo.fornecedorId ??
            null,

          ativo:
            insumo.ativo,

          observacao:
            insumo.observacao ??
            null,

          criadoEm:
            new Date(
              insumo.criadoEm
            ),

          atualizadoEm:
            new Date(
              insumo.atualizadoEm
            ),
        },

        include: {
          categoriaInsumo: {
            select: {
              id: true,
              nome: true,
            },
          },

          unidadeMedida: {
            select: {
              id: true,
              nome: true,
              abreviacao: true,
            },
          },
        },
      });

    return mapearInsumo(criado);
  }

  async buscarPorId(
    id: string
  ): Promise<
    Insumo | undefined
  > {
    const encontrado =
      await prisma.insumo.findFirst({
        where: {
          id,

          empresaId:
            this.contexto.empresaId,
        },

        include: {
          categoriaInsumo: {
            select: {
              id: true,
              nome: true,
            },
          },

          unidadeMedida: {
            select: {
              id: true,
              nome: true,
              abreviacao: true,
            },
          },
        },
      });

    if (!encontrado) {
      return undefined;
    }

    return mapearInsumo(
      encontrado
    );
  }

  async listar(): Promise<
    Insumo[]
  > {
    const insumos =
      await prisma.insumo.findMany({
        where: {
          empresaId:
            this.contexto.empresaId,
        },

        orderBy: {
          nome: "asc",
        },

        include: {
          categoriaInsumo: {
            select: {
              id: true,
              nome: true,
            },
          },

          unidadeMedida: {
            select: {
              id: true,
              nome: true,
              abreviacao: true,
            },
          },
        },
      });

    return insumos.map(
      mapearInsumo
    );
  }

  async atualizar(
    insumo: Insumo
  ): Promise<Insumo> {
    const atualizado =
      await prisma.insumo.update({
        where: {
          id: insumo.id,
        },

        data: {
          nome: insumo.nome,

          categoriaId:
            insumo.categoriaId,

          unidadeCompraId:
            insumo.unidadeCompraId,

          quantidadeCompra:
            insumo.quantidadeCompra,

          precoCompra:
            insumo.precoCompra,

          custoUnitario:
            insumo.custoUnitario,

          fornecedorId:
            insumo.fornecedorId ??
            null,

          ativo:
            insumo.ativo,

          observacao:
            insumo.observacao ??
            null,

          atualizadoEm:
            new Date(
              insumo.atualizadoEm
            ),
        },

        include: {
          categoriaInsumo: {
            select: {
              id: true,
              nome: true,
            },
          },

          unidadeMedida: {
            select: {
              id: true,
              nome: true,
              abreviacao: true,
            },
          },
        },
      });

    return mapearInsumo(
      atualizado
    );
  }
}

export function criarInsumoRepositoryPostgres(
  contexto: EmpresaContext
): InsumoRepositoryPostgres {
  return new InsumoRepositoryPostgres(
    contexto
  );
}