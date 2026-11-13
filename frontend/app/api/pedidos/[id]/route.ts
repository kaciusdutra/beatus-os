import { NextResponse } from "next/server";

import { getConsultaPedidoService } from "@/modules/pedidos/services/server/consultaPedidoServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Detalhe de um pedido: itens, valores, endereço, pagamentos e histórico.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const pedido = await getConsultaPedidoService().detalhe(id);

    return NextResponse.json({ sucesso: true, pedido });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler o pedido.", 404);
  }
}
