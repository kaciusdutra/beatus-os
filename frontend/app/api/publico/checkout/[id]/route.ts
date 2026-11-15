import { NextResponse } from "next/server";

import { limitarVisitante } from "@/core/seguranca/limitesPublicos";

import { getCheckoutService } from "@/modules/checkout/services/server/checkoutServiceFactory";

import { respostaDeErroPublica } from "@/modules/checkout/services/server/respostaPublica";

// Rota pública: como está o pedido do site (pagamento e número do pedido). O código do
// checkout é um identificador longo e aleatório que só o próprio cliente conhece; a
// resposta nunca traz dados pessoais.
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const limite = limitarVisitante("checkout-status", request, 60, 60_000);

  if (limite) {
    return limite;
  }

  try {
    const { id } = await context.params;

    // Só aceita o formato de um código válido (uuid).
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ sucesso: false, mensagem: "Pedido não encontrado." }, { status: 404 });
    }

    const status = await getCheckoutService(request).status(id);

    if (!status) {
      return NextResponse.json({ sucesso: false, mensagem: "Pedido não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ sucesso: true, ...status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return respostaDeErroPublica(error);
  }
}
