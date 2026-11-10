import {
  NextResponse,
} from "next/server";

import {
  criarEntradaCompraServicePostgres,
} from "@/modules/compras/services/server/entradaCompraServiceFactory";

const entradaCompraService =
  criarEntradaCompraServicePostgres();

// Itens de compras confirmadas e o insumo ligado a cada um (bloco 8A).
export async function GET() {
  try {
    const vinculos =
      await entradaCompraService.listarVinculosCompra();

    return NextResponse.json({
      sucesso: true,
      vinculos,
    });
  } catch (error) {
    console.error(
      "ERRO AO LISTAR OS VÍNCULOS DOS ITENS DE COMPRA:",
      error
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível listar os itens de compra.",
      },
      { status: 500 }
    );
  }
}
