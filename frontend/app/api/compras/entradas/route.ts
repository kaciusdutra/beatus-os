import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  criarEntradaCompraServicePostgres,
} from "@/modules/compras/services/server/entradaCompraServiceFactory";

const entradaCompraService =
  criarEntradaCompraServicePostgres();

export async function GET(
  request: NextRequest
) {
  const id =
    request.nextUrl.searchParams.get(
      "id"
    );

  try {
    if (id?.trim()) {
      const entrada =
        await entradaCompraService.buscarPorId(
          id.trim()
        );

      return NextResponse.json({
        sucesso: true,
        encontrada:
          Boolean(entrada),
        entrada:
          entrada ?? null,
      });
    }

    const entradas =
      await entradaCompraService.listar();

    return NextResponse.json({
      sucesso: true,
      entradas,
    });
  } catch (error) {
    console.error(
      "ERRO AO BUSCAR ENTRADAS DE COMPRA:",
      error
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível localizar as entradas de compra.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
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

    const agora =
      new Date().toISOString();

    const entrada =
      await entradaCompraService.criarEntradaCompra({
        entrada: {
          id:
            crypto.randomUUID(),

          fornecedorId:
            body.fornecedorId.trim(),

          tipoDocumento:
            body.tipoDocumento,
          
          status: "RASCUNHO",

          documentos: [],

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
            agora,

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

          itens:
            body.itens.map(
              (
                item: Record<
                  string,
                  unknown
                >
              ) => ({
                id:
                  crypto.randomUUID(),

                entradaCompraId:
                  "",

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
                  agora,

                atualizadoEm:
                  agora,
              })
            ),

          criadoEm:
            agora,

          atualizadoEm:
            agora,
        },
      });

    return NextResponse.json(
      {
        sucesso: true,
        entrada,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "ERRO AO CADASTRAR ENTRADA DE COMPRA:",
      error
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível cadastrar a entrada de compra.";

    return NextResponse.json(
      {
        sucesso: false,
        mensagem,
      },
      {
        status: 400,
      }
    );
  }
}