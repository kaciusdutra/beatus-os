import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  criarEntradaCompraServicePostgres,
} from "@/modules/compras/services/server/entradaCompraServiceFactory";

const entradaCompraService =
  criarEntradaCompraServicePostgres();

function statusDoErro(
  mensagem: string
): number {
  return mensagem.includes("não encontrad")
    ? 404
    : 400;
}

// Liga (ou desliga, com insumoId null) o insumo de um item do fornecedor.
// Corpo: { insumoId: string | null }
export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json();

    if (
      !corpo ||
      typeof corpo !== "object" ||
      !("insumoId" in corpo) ||
      (corpo.insumoId !== null &&
        typeof corpo.insumoId !== "string")
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Informe o insumo (insumoId) ou null para desligar.",
        },
        { status: 400 }
      );
    }

    const vinculo =
      await entradaCompraService.vincularItemCompraAoInsumo(
        id,
        corpo.insumoId
      );

    return NextResponse.json({
      sucesso: true,
      vinculo,
    });
  } catch (error) {
    console.error(
      "ERRO AO LIGAR O ITEM DE COMPRA AO INSUMO:",
      error
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível ligar o item ao insumo.";

    return NextResponse.json(
      {
        sucesso: false,
        mensagem,
      },
      { status: statusDoErro(mensagem) }
    );
  }
}
