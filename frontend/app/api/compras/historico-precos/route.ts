import {
  NextResponse,
} from "next/server";

import {
  criarEntradaCompraServicePostgres,
} from "@/modules/compras/services/server/entradaCompraServiceFactory";

const entradaCompraService =
  criarEntradaCompraServicePostgres();

// Bloco 8C: histórico de preços de um insumo (compra mais nova primeiro).
export async function GET(request: Request) {
  try {
    const insumoId = new URL(request.url).searchParams.get(
      "insumoId"
    );

    if (!insumoId) {
      return NextResponse.json(
        { sucesso: false, mensagem: "Informe o insumo." },
        { status: 400 }
      );
    }

    const historico =
      await entradaCompraService.listarHistoricoPrecosInsumo(
        insumoId
      );

    return NextResponse.json({ sucesso: true, historico });
  } catch (error) {
    console.error("ERRO AO LISTAR O HISTÓRICO DE PREÇOS:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível listar o histórico de preços.",
      },
      { status: 500 }
    );
  }
}
