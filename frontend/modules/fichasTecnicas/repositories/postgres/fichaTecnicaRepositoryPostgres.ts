import "server-only";

import { prisma } from "@/lib/prisma";
import type { EmpresaContext } from "@/core/context/empresaContext";

import {
  FichaTecnicaRepositoryPort,
} from "../fichaTecnicaRepositoryPort";

import {
  FichaTecnica,
  FichaTecnicaItem,
} from "../../types/fichaTecnica";


function mapearFichaTecnica(
  ficha: {
    id: string;
    tipo: string;
    produtoId: string | null;
    nome: string;
    rendimento: unknown;
    unidadeRendimento: string | null;
    embalagem: unknown;
    ativo: boolean;
    criadoEm: Date;
    atualizadoEm: Date;

    itens: Array<{
      id: string;
      tipo: string;

      insumoId: string | null;
      preparacaoId: string | null;

      quantidade: unknown;
      unidade: string;

      percentualPerda: unknown;
      custoCalculado: unknown;

      observacao: string | null;
    }>;
  }
): FichaTecnica {
  if (
    ficha.tipo !== "PRODUTO" &&
    ficha.tipo !== "PREPARACAO"
  ) {
    throw new Error(
      `Tipo de ficha técnica inválido: ${ficha.tipo}`
    );
  }

  const itens: FichaTecnicaItem[] =
    ficha.itens.map((item) => {
      if (
        item.tipo !== "INSUMO" &&
        item.tipo !== "PREPARACAO"
      ) {
        throw new Error(
          `Tipo de item de ficha técnica inválido: ${item.tipo}`
        );
      }

      return {
        id: item.id,

        tipo: item.tipo,

        insumoId:
          item.insumoId ??
          undefined,

        preparacaoId:
          item.preparacaoId ??
          undefined,

        quantidade:
          Number(item.quantidade),

        unidade:
          item.unidade,

        percentualPerda:
          Number(
            item.percentualPerda
          ),

        custoCalculado:
          Number(
            item.custoCalculado
          ),

        observacao:
          item.observacao ??
          undefined,
      };
    });

  return {
    id: ficha.id,

    tipo: ficha.tipo,

    produtoId:
      ficha.produtoId ??
      undefined,

    nome:
      ficha.nome,

    rendimento:
      ficha.rendimento == null
        ? undefined
        : Number(
            ficha.rendimento
          ),

    unidadeRendimento:
      ficha.unidadeRendimento ??
      undefined,

    embalagem:
      Number(ficha.embalagem),

    ativo:
      ficha.ativo,

    itens,

    criadoEm:
      ficha.criadoEm.toISOString(),

    atualizadoEm:
      ficha.atualizadoEm.toISOString(),
  };
}


export class FichaTecnicaRepositoryPostgres
  implements FichaTecnicaRepositoryPort
{
  constructor(
    private readonly contexto: EmpresaContext
  ) {}


  async buscarPorId(
    id: string
  ): Promise<FichaTecnica | undefined> {
    const ficha =
      await prisma.fichaTecnica.findFirst({
        where: {
          id,

          empresaId:
            this.contexto.empresaId,
        },

        include: {
          itens: true,
        },
      });

    if (!ficha) {
      return undefined;
    }

    return mapearFichaTecnica(
      ficha
    );
  }


  async buscarPorProdutoId(
    produtoId: string
  ): Promise<
    FichaTecnica | undefined
  > {
    const ficha =
      await prisma.fichaTecnica.findFirst({
        where: {
          produtoId,

          empresaId:
            this.contexto.empresaId,
        },

        include: {
          itens: true,
        },
      });

    if (!ficha) {
      return undefined;
    }

    return mapearFichaTecnica(
      ficha
    );
  }


  async criar(
    ficha: FichaTecnica
  ): Promise<FichaTecnica> {
    const criada =
      await prisma.fichaTecnica.create({
        data: {
          id:
            ficha.id,

          tipo:
            ficha.tipo,

          empresaId:
            this.contexto.empresaId,

          produtoId:
            ficha.produtoId ??
            null,

          nome:
            ficha.nome,

          rendimento:
            ficha.rendimento ??
            null,

          unidadeRendimento:
            ficha.unidadeRendimento ??
            null,

          embalagem:
            ficha.embalagem,

          ativo:
            ficha.ativo,

          criadoEm:
            new Date(
              ficha.criadoEm
            ),

          atualizadoEm:
            new Date(
              ficha.atualizadoEm
            ),

          itens: {
            create:
              ficha.itens.map(
                (item) => ({
                  id:
                    item.id,

                  tipo:
                    item.tipo,

                  insumoId:
                    item.insumoId ??
                    null,

                  preparacaoId:
                    item.preparacaoId ??
                    null,

                  quantidade:
                    item.quantidade,

                  unidade:
                    item.unidade,

                  percentualPerda:
                    item.percentualPerda,

                  custoCalculado:
                    item.custoCalculado,

                  observacao:
                    item.observacao ??
                    null,
                })
              ),
          },
        },

        include: {
          itens: true,
        },
      });

    return mapearFichaTecnica(
      criada
    );
  }


  async atualizar(
    ficha: FichaTecnica
  ): Promise<FichaTecnica> {
    const existente =
      await prisma.fichaTecnica.findFirst({
        where: {
          id:
            ficha.id,

          empresaId:
            this.contexto.empresaId,
        },

        include: {
          itens: true,
        },
      });

    if (!existente) {
      throw new Error(
        "Ficha técnica não encontrada."
      );
    }


    const idsExistentes =
      new Set(
        existente.itens.map(
          (item) => item.id
        )
      );


    const idsRecebidos =
      new Set(
        ficha.itens.map(
          (item) => item.id
        )
      );


    for (const item of ficha.itens) {
      if (
        idsExistentes.has(item.id)
      ) {
        await prisma.fichaTecnicaItem.update({
          where: {
            id: item.id,
          },

          data: {
            tipo:
              item.tipo,

            insumoId:
              item.insumoId ??
              null,

            preparacaoId:
              item.preparacaoId ??
              null,

            quantidade:
              item.quantidade,

            unidade:
              item.unidade,

            percentualPerda:
              item.percentualPerda,

            custoCalculado:
              item.custoCalculado,

            observacao:
              item.observacao ??
              null,

            atualizadoEm:
              new Date(),
          },
        });

        continue;
      }


      await prisma.fichaTecnicaItem.create({
        data: {
          fichaTecnicaId:
            ficha.id,

          tipo:
            item.tipo,

          insumoId:
            item.insumoId ??
            null,

          preparacaoId:
            item.preparacaoId ??
            null,

          quantidade:
            item.quantidade,

          unidade:
            item.unidade,

          percentualPerda:
            item.percentualPerda,

          custoCalculado:
            item.custoCalculado,

          observacao:
            item.observacao ??
            null,
        },
      });
    }


    const idsParaRemover =
      existente.itens
        .filter(
          (item) =>
            !idsRecebidos.has(
              item.id
            )
        )
        .map(
          (item) => item.id
        );


    if (
      idsParaRemover.length > 0
    ) {
      await prisma.fichaTecnicaItem.deleteMany({
        where: {
          id: {
            in: idsParaRemover,
          },

          fichaTecnicaId:
            ficha.id,
        },
      });
    }


    const atualizada =
      await prisma.fichaTecnica.update({
        where: {
          id:
            ficha.id,
        },

        data: {
          tipo:
            ficha.tipo,

          produtoId:
            ficha.produtoId ??
            null,

          nome:
            ficha.nome,

          rendimento:
            ficha.rendimento ??
            null,

          unidadeRendimento:
            ficha.unidadeRendimento ??
            null,

          embalagem:
            ficha.embalagem,

          ativo:
            ficha.ativo,

          atualizadoEm:
            new Date(
              ficha.atualizadoEm
            ),
        },

        include: {
          itens: true,
        },
      });


    return mapearFichaTecnica(
      atualizada
    );
  }
}


export function criarFichaTecnicaRepositoryPostgres(
  contexto: EmpresaContext
): FichaTecnicaRepositoryPostgres {
  return new FichaTecnicaRepositoryPostgres(
    contexto
  );
}