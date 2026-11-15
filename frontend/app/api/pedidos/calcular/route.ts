import { NextResponse } from "next/server";

import { calcularPedidoSemGravar } from "@/modules/pedidos/services/server/calculoPedidoService";

import { lerPedidoDoCorpo } from "@/modules/pedidos/services/server/lerPedidoDoCorpo";

import { ErroDePedido } from "@/modules/pedidos/services/calcularPedido";

// Calcula o total do pedido (preço do canal, taxa de entrega) sem lançar nada.
// Corpo: { canal, itens: [{ produtoId, quantidade, adicionais? }], distanciaEntregaKm }
export async function POST(request: Request) {
  try {
    const calculo = await calcularPedidoSemGravar(lerPedidoDoCorpo(await request.json()));

    return NextResponse.json({
      sucesso: true,
      calculo: {
        subtotal: calculo.subtotal,
        taxaEntrega: calculo.taxaEntrega,
        total: calculo.total,
        distanciaEntregaKm: calculo.distanciaEntregaKm,
      },
    });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Não foi possível calcular o pedido.";

    return NextResponse.json(
      { sucesso: false, mensagem },
      { status: error instanceof ErroDePedido ? 422 : 400 }
    );
  }
}
