import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getLancarPedidoServicePostgres,
} from "@/modules/pedidos/services/server/lancarPedidoServicePostgres";

import {
  ErroDePedido,
} from "@/modules/pedidos/services/calcularPedido";

import type {
  PedidoSolicitado,
} from "@/modules/pedidos/types/pedidoSolicitado";

const lancarPedidoService =
  getLancarPedidoServicePostgres();

function resposta(
  mensagem: string,
  status: number
) {
  return NextResponse.json(
    {
      sucesso: false,

      mensagem,
    },
    {
      status,
    }
  );
}

// Lança um pedido (sprint S2). A tela só informa o que o cliente escolheu:
// produto, quantidade, adicionais, endereço e pagamento. Preço, subtotal,
// taxa de entrega, total, número, datas e situação vêm do servidor; qualquer
// valor desses que venha no corpo é ignorado.
export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    if (
      !body ||
      typeof body !==
        "object"
    ) {
      return resposta(
        "Dados do pedido inválidos.",
        400
      );
    }

    const clienteId =
      body.clienteId ??
      body.cliente?.clienteId;

    if (
      typeof clienteId !==
        "string" ||
      !clienteId.trim()
    ) {
      return resposta(
        "Cliente do pedido não informado.",
        400
      );
    }

    if (
      !Array.isArray(
        body.itens
      ) ||
      body.itens.length ===
        0
    ) {
      return resposta(
        "O pedido precisa ter pelo menos um item.",
        400
      );
    }

    if (
      !body.pagamento ||
      typeof body.pagamento !==
        "object"
    ) {
      return resposta(
        "Pagamento do pedido não informado.",
        400
      );
    }

    if (
      !body.enderecoEntrega ||
      typeof body.enderecoEntrega !==
        "object"
    ) {
      return resposta(
        "Endereço de entrega não informado.",
        400
      );
    }

    // Só os campos permitidos passam adiante.
    const pedido: PedidoSolicitado =
      {
        id:
          typeof body.id ===
          "string"
            ? body.id
            : undefined,

        canal:
          body.canal,

        entrada:
          body.entrada,

        identificadorExterno:
          typeof body.identificadorExterno ===
          "string"
            ? body.identificadorExterno
            : undefined,

        clienteId,

        enderecoEntrega:
          body.enderecoEntrega,

        distanciaEntregaKm:
          typeof body.distanciaEntregaKm ===
          "number"
            ? body.distanciaEntregaKm
            : null,

        itens:
          body.itens.map(
            (
              item: Record<
                string,
                unknown
              >
            ) => ({
              produtoId:
                typeof item?.produtoId ===
                "string"
                  ? item.produtoId
                  : "",

              quantidade:
                item?.quantidade as number,

              observacao:
                typeof item?.observacao ===
                "string"
                  ? item.observacao
                  : undefined,

              adicionais:
                Array.isArray(
                  item?.adicionais
                )
                  ? (
                      item.adicionais as Record<
                        string,
                        unknown
                      >[]
                    ).map(
                      (
                        adicional
                      ) => ({
                        produtoId:
                          typeof adicional?.produtoId ===
                          "string"
                            ? adicional.produtoId
                            : typeof adicional?.id ===
                                "string"
                              ? adicional.id
                              : "",

                        quantidade:
                          adicional?.quantidade as number,
                      })
                    )
                  : undefined,
            })
          ),

        pagamento: {
          modalidade:
            body.pagamento
              .modalidade,

          forma:
            body.pagamento
              .forma,

          status:
            body.pagamento
              .status,
        },
      };

    const resultado =
      await lancarPedidoService.executar({
        pedido,
      });

    return NextResponse.json(
      {
        sucesso: true,

        ...resultado,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível lançar o pedido.";

    if (
      error instanceof
      ErroDePedido
    ) {
      return resposta(
        mensagem,
        422
      );
    }

    if (
      mensagem ===
      "Cliente não encontrado."
    ) {
      return resposta(
        mensagem,
        404
      );
    }

    if (
      mensagem ===
      "Este pedido já foi lançado."
    ) {
      return resposta(
        mensagem,
        409
      );
    }

    console.error(
      "ERRO AO LANÇAR O PEDIDO:",
      error
    );

    return resposta(
      "Não foi possível lançar o pedido.",
      500
    );
  }
}
