import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  criarEntradaCompraServicePostgres,
} from "@/modules/compras/services/server/entradaCompraServiceFactory";

const entradaCompraService =
  criarEntradaCompraServicePostgres();

export async function POST(
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
            "Dados de cancelamento inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof body.motivo !==
        "string" ||
      !body.motivo.trim()
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "O motivo do cancelamento é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    const entrada =
      await entradaCompraService.cancelarEntradaCompra(
        id,
        body.motivo.trim()
      );

    return NextResponse.json({
      sucesso: true,
      entrada,
    });
  } catch (error) {
    console.error(
      "ERRO AO CANCELAR ENTRADA DE COMPRA:",
      error
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível cancelar a entrada de compra.";

    const naoEncontrada =
      mensagem ===
      "Entrada de compra não encontrada.";

    const conflito =
      mensagem.includes(
        "Somente entradas CONFIRMADAS"
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
              : 400,
      }
    );
  }
}