import { NextResponse } from "next/server";

import { criarEntradaCompraServicePostgres } from "@/modules/compras/services/server/entradaCompraServiceFactory";
import { criarArquivoStorage } from "@/modules/compras/services/storage/arquivoStorageFactory";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
      documentoId: string;
    }>;
  },
) {
  const { id, documentoId } = await context.params;

  try {
    if (!id || !documentoId) {
      return NextResponse.json(
        {
          erro:
            "ID da entrada de compra e ID do documento são obrigatórios.",
        },
        { status: 400 },
      );
    }

    const service =
      criarEntradaCompraServicePostgres();

    const documento =
      await service.buscarDocumentoPorId(
        documentoId,
      );

    if (!documento) {
      return NextResponse.json(
        {
          erro:
            "Documento da entrada de compra não encontrado.",
        },
        { status: 404 },
      );
    }

    if (
      documento.entradaCompraId !== id
    ) {
      return NextResponse.json(
        {
          erro:
            "O documento informado não pertence à entrada de compra.",
        },
        { status: 409 },
      );
    }

    const storage =
      criarArquivoStorage();

    const arquivoExiste =
      await storage.existe(
        documento.caminhoArquivo,
      );

    if (!arquivoExiste) {
      return NextResponse.json(
        {
          erro:
            "O arquivo físico do documento não foi encontrado no storage.",
        },
        { status: 404 },
      );
    }

    const arquivo =
      await storage.obter(
        documento.caminhoArquivo,
      );

    return new NextResponse(
      new Uint8Array(arquivo),
      {
        status: 200,
        headers: {
          "Content-Type":
            documento.mimeType,
          "Content-Length":
            String(arquivo.length),
          "Content-Disposition":
            `inline; filename="${documento.nomeArquivo.replace(
              /["\r\n]/g,
              "_",
            )}"`,
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao obter documento.";

    console.error(
      "Erro ao obter documento:",
      erro,
    );

    return NextResponse.json(
      { erro: mensagem },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
      documentoId: string;
    }>;
  },
) {
  const { id, documentoId } = await context.params;

  try {
    if (!id || !documentoId) {
      return NextResponse.json(
        {
          erro:
            "ID da entrada de compra e ID do documento são obrigatórios.",
        },
        { status: 400 },
      );
    }

    const service =
      criarEntradaCompraServicePostgres();

    const documento =
      await service.buscarDocumentoPorId(
        documentoId,
      );

    if (!documento) {
      return NextResponse.json(
        {
          erro:
            "Documento da entrada de compra não encontrado.",
        },
        { status: 404 },
      );
    }

    if (
      documento.entradaCompraId !== id
    ) {
      return NextResponse.json(
        {
          erro:
            "O documento informado não pertence à entrada de compra.",
        },
        { status: 409 },
      );
    }

    const storage =
      criarArquivoStorage();

    let conteudoArquivo:
      Buffer | undefined;

    if (
      await storage.existe(
        documento.caminhoArquivo,
      )
    ) {
      conteudoArquivo =
        await storage.obter(
          documento.caminhoArquivo,
        );

      await storage.excluir(
        documento.caminhoArquivo,
      );
    }

    try {
      await service.removerDocumento(
        documentoId,
      );
    } catch (erroBanco) {
      if (conteudoArquivo) {
        try {
          const arquivoRestaurado =
            new File(
              [
                new Uint8Array(
                  conteudoArquivo,
                ),
              ],
              documento.nomeArquivo,
              {
                type:
                  documento.mimeType,
              },
            );

          await storage.salvar(
            documento.caminhoArquivo,
            arquivoRestaurado,
          );
        } catch (
          erroRestauracao
        ) {
          console.error(
            "Falha ao restaurar arquivo após erro na remoção do documento:",
            erroRestauracao,
          );
        }
      }

      throw erroBanco;
    }

    return NextResponse.json({
      sucesso: true,
      documentoId,
      mensagem:
        "Documento removido com sucesso.",
    });
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao remover documento.";

    if (
      mensagem ===
      "Documento da entrada de compra não encontrado."
    ) {
      return NextResponse.json(
        { erro: mensagem },
        { status: 404 },
      );
    }

    if (
      mensagem ===
      "Somente entradas em RASCUNHO podem remover documentos."
    ) {
      return NextResponse.json(
        { erro: mensagem },
        { status: 409 },
      );
    }

    console.error(
      "Erro ao remover documento:",
      erro,
    );

    return NextResponse.json(
      { erro: mensagem },
      { status: 500 },
    );
  }
}