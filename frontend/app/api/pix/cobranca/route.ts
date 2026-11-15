import { NextResponse } from "next/server";

import { getPixService } from "@/modules/pix/services/server/pixServiceFactory";

import { calcularPedidoSemGravar } from "@/modules/pedidos/services/server/calculoPedidoService";

import { lerPedidoDoCorpo } from "@/modules/pedidos/services/server/lerPedidoDoCorpo";

import { ErroDePedido } from "@/modules/pedidos/services/calcularPedido";

// Gera o Pix copia e cola de um pedido. O valor é o total calculado pelo
// servidor (nunca o que a tela mostra). Só para canais próprios.
// Corpo: { canal, itens: [{ produtoId, quantidade, adicionais? }], distanciaEntregaKm }
export async function POST(request: Request) {
  try {
    const pedido = lerPedidoDoCorpo(await request.json());

    if (["IFOOD", "99FOOD", "KEETA"].includes(pedido.canal)) {
      return NextResponse.json(
        { sucesso: false, mensagem: "Pedido de marketplace é pago pela plataforma, não por Pix." },
        { status: 422 }
      );
    }

    const calculo = await calcularPedidoSemGravar(pedido);

    const cobranca = await getPixService().gerarCobranca(calculo.total, "Pedido Beatus");

    return NextResponse.json({
      sucesso: true,
      cobranca,
      calculo: {
        subtotal: calculo.subtotal,
        taxaEntrega: calculo.taxaEntrega,
        total: calculo.total,
      },
    });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Não foi possível gerar o Pix.";

    return NextResponse.json(
      { sucesso: false, mensagem },
      { status: error instanceof ErroDePedido ? 422 : 400 }
    );
  }
}
