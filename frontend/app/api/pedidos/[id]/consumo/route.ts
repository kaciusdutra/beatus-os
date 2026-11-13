import { NextResponse } from "next/server";

import { getOperacaoPedidoService } from "@/modules/pedidos/services/server/operacaoPedidoService";

// O que o pedido já tirou do estoque (para a tela de cancelamento marcar o
// que dá para aproveitar).
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const consumo = await getOperacaoPedidoService().consumo(id);

    return NextResponse.json({ sucesso: true, consumo });
  } catch (error) {
    console.error("ERRO AO LER O CONSUMO DO PEDIDO:", error);

    return NextResponse.json(
      { sucesso: false, mensagem: "Não foi possível ler o consumo do pedido." },
      { status: 500 }
    );
  }
}
