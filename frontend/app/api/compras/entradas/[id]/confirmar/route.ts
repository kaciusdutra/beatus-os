import {
  NextResponse,
} from "next/server";

import {
  criarEntradaCompraServicePostgres,
} from "@/modules/compras/services/server/entradaCompraServiceFactory";

const entradaCompraService =
  criarEntradaCompraServicePostgres();

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    const entrada =
      await entradaCompraService.confirmarEntradaCompra(
        id
      );

    return NextResponse.json({
      sucesso: true,
      entrada,
    });
  } catch (error) {
    console.error(
      "ERRO AO CONFIRMAR ENTRADA DE COMPRA:",
      error
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível confirmar a entrada de compra.";

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
              : 400,
      }
    );
  }
}