import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getLancarPedidoServicePostgres,
} from "@/modules/pedidos/services/server/lancarPedidoServicePostgres";

const lancarPedidoService =
  getLancarPedidoServicePostgres();

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
      return NextResponse.json(
        {
          sucesso: false,

          mensagem:
            "Dados do pedido inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.id ||
      !body.numero
    ) {
      return NextResponse.json(
        {
          sucesso: false,

          mensagem:
            "Pedido sem identificador ou número.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.cliente?.clienteId
    ) {
      return NextResponse.json(
        {
          sucesso: false,

          mensagem:
            "Cliente do pedido não informado.",
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
      body.itens.length ===
        0
    ) {
      return NextResponse.json(
        {
          sucesso: false,

          mensagem:
            "O pedido precisa ter pelo menos um item.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.pagamento
    ) {
      return NextResponse.json(
        {
          sucesso: false,

          mensagem:
            "Pagamento do pedido não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const resultado =
      await lancarPedidoService.executar({
        pedido: body,
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

    const clienteNaoEncontrado =
      mensagem ===
      "Cliente não encontrado.";

    const pedidoDuplicado =
      mensagem ===
      "Este pedido já foi lançado.";

    return NextResponse.json(
      {
        sucesso: false,

        mensagem,
      },
      {
        status:
          clienteNaoEncontrado
            ? 404
            : pedidoDuplicado
              ? 409
              : 500,
      }
    );
  }
}