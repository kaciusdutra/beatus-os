import { NextRequest, NextResponse } from "next/server";

import { getOperacaoPedidoService } from "@/modules/pedidos/services/server/operacaoPedidoService";

// Fila de impressão (tickets da cozinha). Um impressor automático, quando
// existir, lê esta fila e marca cada ticket em /api/pedidos/[id]/ticket.
// ?status=PENDENTE|IMPRESSO|FALHOU
export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status") || "PENDENTE";

    const fila = await getOperacaoPedidoService().fila(status);

    return NextResponse.json({ sucesso: true, fila });
  } catch (error) {
    console.error("ERRO AO LER A FILA DE IMPRESSÃO:", error);

    return NextResponse.json(
      { sucesso: false, mensagem: "Não foi possível ler a fila de impressão." },
      { status: 500 }
    );
  }
}
