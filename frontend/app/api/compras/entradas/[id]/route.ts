import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  criarEntradaCompraServicePostgres,
} from "@/modules/compras/services/server/entradaCompraServiceFactory";

const entradaCompraService =
  criarEntradaCompraServicePostgres();

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    const body =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Dados da entrada de compra inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.fornecedorId?.trim()
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "O fornecedor da entrada de compra é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.tipoDocumento
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "O tipo de documento da entrada de compra é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(
        body.itens
      ) ||
      body.itens.length === 0
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "A entrada de compra precisa ter pelo menos um item.",
        },
        {
          status: 400,
        }
      );
    }

    const existente =
      await entradaCompraService.buscarPorId(
        id
      );

    if (!existente) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Entrada de compra não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    const agora =
      new Date().toISOString();

    const itensExistentes =
      existente.itens;

    const itens =
      body.itens.map(
        (
          item: Record<
            string,
            unknown
          >
        ) => {
          const itemId =
            typeof item.id ===
              "string" &&
            item.id.trim()
              ? item.id.trim()
              : undefined;

          const itemExistente =
            itemId
              ? itensExistentes.find(
                  (
                    itemBanco
                  ) =>
                    itemBanco.id ===
                    itemId
                )
              : undefined;

          return {
            id:
              itemExistente?.id ??
              crypto.randomUUID(),

            entradaCompraId:
              id,

            descricaoOriginal:
              typeof item.descricaoOriginal ===
              "string"
                ? item.descricaoOriginal.trim()
                : "",

            codigoFornecedor:
              typeof item.codigoFornecedor ===
              "string"
                ? item.codigoFornecedor.trim() ||
                  undefined
                : undefined,

            quantidade:
              Number(
                item.quantidade
              ),

            unidade:
              typeof item.unidade ===
              "string"
                ? item.unidade.trim()
                : "",

            valorUnitario:
              Number(
                item.valorUnitario
              ),

            desconto:
              Number(
                item.desconto ??
                  0
              ),

            valorTotal:
              Number(
                item.valorTotal
              ),

            lote:
              typeof item.lote ===
              "string"
                ? item.lote.trim() ||
                  undefined
                : undefined,

            validade:
              item.validade
                ? String(
                    item.validade
                  )
                : undefined,

            observacao:
              typeof item.observacao ===
              "string"
                ? item.observacao.trim() ||
                  undefined
                : undefined,

            criadoEm:
              itemExistente?.criadoEm ??
              agora,

            atualizadoEm:
              agora,
          };
        }
      );

    const entrada =
      await entradaCompraService.atualizarEntradaCompra({
        entrada: {
          id,

          fornecedorId:
            body.fornecedorId.trim(),

          tipoDocumento:
            body.tipoDocumento,

          status:
            existente.status,

          documentos:
            existente.documentos,

          numeroDocumento:
            body.numeroDocumento?.trim() ||
            undefined,

          serie:
            body.serie?.trim() ||
            undefined,

          chaveAcesso:
            body.chaveAcesso?.trim() ||
            undefined,

          dataDocumento:
            body.dataDocumento ||
            undefined,

          dataEntrada:
            body.dataEntrada ||
            existente.dataEntrada,

          valorProdutos:
            Number(
              body.valorProdutos ??
                0
            ),

          valorDesconto:
            Number(
              body.valorDesconto ??
                0
            ),

          valorFrete:
            Number(
              body.valorFrete ??
                0
            ),

          valorTotal:
            Number(
              body.valorTotal ??
                0
            ),

          documentoArquivo:
            body.documentoArquivo?.trim() ||
            undefined,

          observacao:
            body.observacao?.trim() ||
            undefined,

          itens,

          criadoEm:
            existente.criadoEm,

          atualizadoEm:
            agora,
        },
      });

    return NextResponse.json({
      sucesso: true,
      entrada,
    });
  } catch (error) {
    console.error(
      "ERRO AO ATUALIZAR ENTRADA DE COMPRA:",
      error
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a entrada de compra.";

    const conflito =
      mensagem.includes(
        "Apenas entradas em RASCUNHO"
      );

    const naoEncontrada =
      mensagem ===
      "Entrada de compra não encontrada.";

    return NextResponse.json(
      {
        sucesso: false,
        mensagem,
      },
      {
        status:
          naoEncontrada
            ? 404
            : conflito
              ? 409
              : 400,
      }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    await entradaCompraService.removerEntradaCompra(
      id
    );

    return NextResponse.json({
      sucesso: true,
      mensagem:
        "Entrada de compra removida com sucesso.",
    });
  } catch (error) {
    console.error(
      "ERRO AO REMOVER ENTRADA DE COMPRA:",
      error
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível remover a entrada de compra.";

    const naoEncontrada =
      mensagem ===
      "Entrada de compra não encontrada.";

    const conflito =
      mensagem.includes(
        "Somente entradas em RASCUNHO"
      );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem,
      },
      {
        status:
          naoEncontrada
            ? 404
            : conflito
              ? 409
              : 500,
      }
    );
  }
}