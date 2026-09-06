import {
  prisma,
} from "@/lib/prisma";

import {
  EmpresaContext,
} from "@/core/context/empresaContext";

import {
  EntradaCompraRepositoryPort,
} from "../entradaCompraRepositoryPort";

import {
  EntradaCompra,
  EntradaCompraItem,
  TipoDocumentoEntradaCompra,
  StatusEntradaCompra,
} from "../../types/entradaCompra";

import {
  EntradaCompraDocumento,
  TipoDocumentoEntradaCompraArquivo,
  OrigemDocumentoEntradaCompra,
  StatusLeituraDocumentoEntradaCompra,
} from "../../types/entradaCompraDocumento";

function mapearItem(
  item: {
    id: string;
    entradaCompraId: string;
    descricaoOriginal: string;
    codigoFornecedor: string | null;
    quantidade: unknown;
    unidade: string;
    valorUnitario: unknown;
    desconto: unknown;
    valorTotal: unknown;
    lote: string | null;
    validade: Date | null;
    observacao: string | null;
    criadoEm: Date;
    atualizadoEm: Date;
  }
): EntradaCompraItem {
  return {
    id:
      item.id,

    entradaCompraId:
      item.entradaCompraId,

    descricaoOriginal:
      item.descricaoOriginal,

    codigoFornecedor:
      item.codigoFornecedor ??
      undefined,

    quantidade:
      Number(item.quantidade),

    unidade:
      item.unidade,

    valorUnitario:
      Number(item.valorUnitario),

    desconto:
      Number(item.desconto),

    valorTotal:
      Number(item.valorTotal),

    lote:
      item.lote ??
      undefined,

    validade:
      item.validade
        ?.toISOString(),

    observacao:
      item.observacao ??
      undefined,

    criadoEm:
      item.criadoEm.toISOString(),

    atualizadoEm:
      item.atualizadoEm.toISOString(),
  };
}

function mapearDocumento(
  documento: {
    id: string;
    entradaCompraId: string;
    nomeArquivo: string;
    mimeType: string;
    tamanho: number;
    tipoDocumento: string;
    origem: string;
    statusLeitura: string;
    caminhoArquivo: string;
    hashArquivo: string | null;
    criadoEm: Date;
    atualizadoEm: Date;
  }
): EntradaCompraDocumento {
  return {
    id:
      documento.id,

    entradaCompraId:
      documento.entradaCompraId,

    nomeArquivo:
      documento.nomeArquivo,

    mimeType:
      documento.mimeType,

    tamanho:
      documento.tamanho,

    tipoDocumento:
      documento.tipoDocumento as
        TipoDocumentoEntradaCompraArquivo,

    origem:
      documento.origem as
        OrigemDocumentoEntradaCompra,

    statusLeitura:
      documento.statusLeitura as
        StatusLeituraDocumentoEntradaCompra,

    caminhoArquivo:
      documento.caminhoArquivo,

    hashArquivo:
      documento.hashArquivo ??
      undefined,

    criadoEm:
      documento.criadoEm.toISOString(),

    atualizadoEm:
      documento.atualizadoEm.toISOString(),
  };
}

function mapearEntrada(
  entrada: {
    id: string;
    empresaId: string;
    fornecedorId: string;
    tipoDocumento: string;
    status: string;
    numeroDocumento: string | null;
    serie: string | null;
    chaveAcesso: string | null;
    dataDocumento: Date | null;
    dataEntrada: Date;
    valorProdutos: unknown;
    valorDesconto: unknown;
    valorFrete: unknown;
    valorTotal: unknown;
    documentoArquivo: string | null;
    observacao: string | null;
    criadoEm: Date;
    atualizadoEm: Date;

    itens: {
      id: string;
      entradaCompraId: string;
      descricaoOriginal: string;
      codigoFornecedor: string | null;
      quantidade: unknown;
      unidade: string;
      valorUnitario: unknown;
      desconto: unknown;
      valorTotal: unknown;
      lote: string | null;
      validade: Date | null;
      observacao: string | null;
      criadoEm: Date;
      atualizadoEm: Date;
    }[];

    documentos: {
      id: string;
      entradaCompraId: string;
      nomeArquivo: string;
      mimeType: string;
      tamanho: number;
      tipoDocumento: string;
      origem: string;
      statusLeitura: string;
      caminhoArquivo: string;
      hashArquivo: string | null;
      criadoEm: Date;
      atualizadoEm: Date;
    }[];
  }
): EntradaCompra {
  return {
    id:
      entrada.id,

    fornecedorId:
      entrada.fornecedorId,

    tipoDocumento:
      entrada.tipoDocumento as
        TipoDocumentoEntradaCompra,

    status:
      entrada.status as
        StatusEntradaCompra,

    numeroDocumento:
      entrada.numeroDocumento ??
      undefined,

    serie:
      entrada.serie ??
      undefined,

    chaveAcesso:
      entrada.chaveAcesso ??
      undefined,

    dataDocumento:
      entrada.dataDocumento
        ?.toISOString(),

    dataEntrada:
      entrada.dataEntrada.toISOString(),

    valorProdutos:
      Number(
        entrada.valorProdutos
      ),

    valorDesconto:
      Number(
        entrada.valorDesconto
      ),

    valorFrete:
      Number(
        entrada.valorFrete
      ),

    valorTotal:
      Number(
        entrada.valorTotal
      ),

    documentoArquivo:
      entrada.documentoArquivo ??
      undefined,

    observacao:
      entrada.observacao ??
      undefined,

    itens:
      entrada.itens.map(
        mapearItem
      ),

    documentos:
      entrada.documentos.map(
        mapearDocumento
      ),

    criadoEm:
      entrada.criadoEm.toISOString(),

    atualizadoEm:
      entrada.atualizadoEm.toISOString(),
  };
}

export class EntradaCompraRepositoryPostgres
  implements EntradaCompraRepositoryPort
{
  constructor(
    private readonly contexto:
      EmpresaContext
  ) {}

  async criar(
    entrada: EntradaCompra
  ): Promise<EntradaCompra> {
    const criado =
      await prisma.entradaCompra.create({
        data: {
          id:
            entrada.id,

          empresaId:
            this.contexto.empresaId,

          fornecedorId:
            entrada.fornecedorId,

          tipoDocumento:
            entrada.tipoDocumento,

          status:
            entrada.status,

          numeroDocumento:
            entrada.numeroDocumento ??
            null,

          serie:
            entrada.serie ??
            null,

          chaveAcesso:
            entrada.chaveAcesso ??
            null,

          dataDocumento:
            entrada.dataDocumento
              ? new Date(
                  entrada.dataDocumento
                )
              : null,

          dataEntrada:
            new Date(
              entrada.dataEntrada
            ),

          valorProdutos:
            entrada.valorProdutos,

          valorDesconto:
            entrada.valorDesconto,

          valorFrete:
            entrada.valorFrete,

          valorTotal:
            entrada.valorTotal,

          documentoArquivo:
            entrada.documentoArquivo ??
            null,

          observacao:
            entrada.observacao ??
            null,

          criadoEm:
            new Date(
              entrada.criadoEm
            ),

          atualizadoEm:
            new Date(
              entrada.atualizadoEm
            ),

          itens: {
            create:
              entrada.itens.map(
                (item) => ({
                  id:
                    item.id,

                  descricaoOriginal:
                    item.descricaoOriginal,

                  codigoFornecedor:
                    item.codigoFornecedor ??
                    null,

                  quantidade:
                    item.quantidade,

                  unidade:
                    item.unidade,

                  valorUnitario:
                    item.valorUnitario,

                  desconto:
                    item.desconto,

                  valorTotal:
                    item.valorTotal,

                  lote:
                    item.lote ??
                    null,

                  validade:
                    item.validade
                      ? new Date(
                          item.validade
                        )
                      : null,

                  observacao:
                    item.observacao ??
                    null,

                  criadoEm:
                    new Date(
                      item.criadoEm
                    ),

                  atualizadoEm:
                    new Date(
                      item.atualizadoEm
                    ),
                })
              ),
          },
        },

        include: {
          itens: true,
          documentos: true,
        },
      });

    return mapearEntrada(
      criado
    );
  }

  async buscarPorId(
    id: string
  ): Promise<
    EntradaCompra | undefined
  > {
    const entrada =
      await prisma.entradaCompra.findFirst({
        where: {
          id,

          empresaId:
            this.contexto.empresaId,
        },

        include: {
          itens: true,
          documentos: true,
        },
      });

    return entrada
      ? mapearEntrada(
          entrada
        )
      : undefined;
  }

  async listar(): Promise<
    EntradaCompra[]
  > {
    const entradas =
      await prisma.entradaCompra.findMany({
        where: {
          empresaId:
            this.contexto.empresaId,
        },

        orderBy: {
          dataEntrada:
            "desc",
        },

        include: {
          itens: true,
          documentos: true,
        },
      });

    return entradas.map(
      mapearEntrada
    );
  }

  async atualizar(
    entrada: EntradaCompra
  ): Promise<EntradaCompra> {
    const existente =
      await prisma.entradaCompra.findFirst({
        where: {
          id:
            entrada.id,

          empresaId:
            this.contexto.empresaId,
        },

        include: {
          itens: true,
          documentos: true,
        },
      });

    if (!existente) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    const idsRecebidos =
      new Set(
        entrada.itens.map(
          (item) =>
            item.id
        )
      );

    const idsExistentes =
      existente.itens.map(
        (item) =>
          item.id
      );

    const idsParaRemover =
      idsExistentes.filter(
        (id) =>
          !idsRecebidos.has(
            id
          )
      );

    const atualizado =
      await prisma.$transaction(
        async (tx) => {
          if (
            idsParaRemover.length >
            0
          ) {
            await tx.entradaCompraItem.deleteMany({
              where: {
                id: {
                  in:
                    idsParaRemover,
                },

                entradaCompraId:
                  entrada.id,
              },
            });
          }

          for (
            const item of entrada.itens
          ) {
            const itemExistente =
              existente.itens.find(
                (
                  itemBanco
                ) =>
                  itemBanco.id ===
                  item.id
              );

            if (
              itemExistente
            ) {
              await tx.entradaCompraItem.update({
                where: {
                  id:
                    item.id,
                },

                data: {
                  descricaoOriginal:
                    item.descricaoOriginal,

                  codigoFornecedor:
                    item.codigoFornecedor ??
                    null,

                  quantidade:
                    item.quantidade,

                  unidade:
                    item.unidade,

                  valorUnitario:
                    item.valorUnitario,

                  desconto:
                    item.desconto,

                  valorTotal:
                    item.valorTotal,

                  lote:
                    item.lote ??
                    null,

                  validade:
                    item.validade
                      ? new Date(
                          item.validade
                        )
                      : null,

                  observacao:
                    item.observacao ??
                    null,

                  atualizadoEm:
                    new Date(
                      item.atualizadoEm
                    ),
                },
              });
            } else {
              await tx.entradaCompraItem.create({
                data: {
                  id:
                    item.id,

                  entradaCompraId:
                    entrada.id,

                  descricaoOriginal:
                    item.descricaoOriginal,

                  codigoFornecedor:
                    item.codigoFornecedor ??
                    null,

                  quantidade:
                    item.quantidade,

                  unidade:
                    item.unidade,

                  valorUnitario:
                    item.valorUnitario,

                  desconto:
                    item.desconto,

                  valorTotal:
                    item.valorTotal,

                  lote:
                    item.lote ??
                    null,

                  validade:
                    item.validade
                      ? new Date(
                          item.validade
                        )
                      : null,

                  observacao:
                    item.observacao ??
                    null,

                  criadoEm:
                    new Date(
                      item.criadoEm
                    ),

                  atualizadoEm:
                    new Date(
                      item.atualizadoEm
                    ),
                },
              });
            }
          }

          return tx.entradaCompra.update({
            where: {
              id:
                entrada.id,
            },

            data: {
              fornecedorId:
                entrada.fornecedorId,

              tipoDocumento:
                entrada.tipoDocumento,

              status:
                entrada.status,

              numeroDocumento:
                entrada.numeroDocumento ??
                null,

              serie:
                entrada.serie ??
                null,

              chaveAcesso:
                entrada.chaveAcesso ??
                null,

              dataDocumento:
                entrada.dataDocumento
                  ? new Date(
                      entrada.dataDocumento
                    )
                  : null,

              dataEntrada:
                new Date(
                  entrada.dataEntrada
                ),

              valorProdutos:
                entrada.valorProdutos,

              valorDesconto:
                entrada.valorDesconto,

              valorFrete:
                entrada.valorFrete,

              valorTotal:
                entrada.valorTotal,

              documentoArquivo:
                entrada.documentoArquivo ??
                null,

              observacao:
                entrada.observacao ??
                null,

              atualizadoEm:
                new Date(
                  entrada.atualizadoEm
                ),
            },

            include: {
              itens: true,
              documentos: true,
            },
          });
        }
      );

    return mapearEntrada(
      atualizado
    );
  }

  async adicionarDocumento(
    documento: EntradaCompraDocumento
  ): Promise<EntradaCompraDocumento> {
    const entrada =
      await prisma.entradaCompra.findFirst({
        where: {
          id:
            documento.entradaCompraId,

          empresaId:
            this.contexto.empresaId,
        },

        select: {
          id: true,
        },
      });

    if (!entrada) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    const criado =
      await prisma.entradaCompraDocumento.create({
        data: {
          id:
            documento.id,

          entradaCompraId:
            documento.entradaCompraId,

          nomeArquivo:
            documento.nomeArquivo,

          mimeType:
            documento.mimeType,

          tamanho:
            documento.tamanho,

          tipoDocumento:
            documento.tipoDocumento,

          origem:
            documento.origem,

          statusLeitura:
            documento.statusLeitura,

          caminhoArquivo:
            documento.caminhoArquivo!,

          hashArquivo:
            documento.hashArquivo ??
            null,

          criadoEm:
            new Date(
              documento.criadoEm
            ),

          atualizadoEm:
            new Date(
              documento.atualizadoEm
            ),
        },
      });

    return mapearDocumento(
      criado
    );
  }

      async buscarDocumentoPorId(
    id: string
  ): Promise<EntradaCompraDocumento | undefined> {
    const documento =
      await prisma.entradaCompraDocumento.findFirst({
        where: {
          id,
          entradaCompra: {
            empresaId: this.contexto.empresaId,
          },
        },
      });

    if (!documento) {
      return undefined;
    }

    return mapearDocumento(documento);
  }

    async removerDocumento(id: string): Promise<void> {
    const documento =
      await prisma.entradaCompraDocumento.findFirst({
        where: {
          id,
          entradaCompra: {
            empresaId: this.contexto.empresaId,
          },
        },
        select: {
          id: true,
        },
      });

    if (!documento) {
      throw new Error(
        "Documento da entrada de compra não encontrado."
      );
    }

    await prisma.entradaCompraDocumento.delete({
      where: {
        id: documento.id,
      },
    });
  }

  async remover(
    id: string
  ): Promise<void> {
    const existente =
      await prisma.entradaCompra.findFirst({
        where: {
          id,

          empresaId:
            this.contexto.empresaId,
        },
      });

    if (!existente) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    await prisma.entradaCompra.delete({
      where: {
        id,
      },
    });
  }
}