import {
  NextResponse,
} from "next/server";

import {
  criarEntradaCompraServicePostgres,
} from "@/modules/compras/services/server/entradaCompraServiceFactory";

const entradaCompraService =
  criarEntradaCompraServicePostgres();

// Bloco 8C: refaz o custo dos insumos a partir das compras já confirmadas.
export async function POST() {
  try {
    const resultado =
      await entradaCompraService.recalcularCustosDasCompras();

    return NextResponse.json({
      sucesso: true,
      ...resultado,
    });
  } catch (error) {
    console.error("ERRO AO RECALCULAR OS CUSTOS:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível recalcular os custos.",
      },
      { status: 500 }
    );
  }
}
