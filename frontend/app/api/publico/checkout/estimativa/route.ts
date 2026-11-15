import { NextResponse } from "next/server";

import { limitarVisitante } from "@/core/seguranca/limitesPublicos";

import { getCheckoutService } from "@/modules/checkout/services/server/checkoutServiceFactory";

import { lerCorpoJson, respostaDeErroPublica } from "@/modules/checkout/services/server/respostaPublica";

// Rota pública: o total do pedido (com a entrega) antes de pagar. Não grava nada.
export async function POST(request: Request) {
  const limite = limitarVisitante("checkout-estimativa", request, 30, 60_000);

  if (limite) {
    return limite;
  }

  try {
    const estimativa = await getCheckoutService(request).estimar(await lerCorpoJson(request));

    return NextResponse.json({ sucesso: true, estimativa });
  } catch (error) {
    return respostaDeErroPublica(error);
  }
}
