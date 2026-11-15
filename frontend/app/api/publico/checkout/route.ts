import { NextResponse } from "next/server";

import { limitarVisitante } from "@/core/seguranca/limitesPublicos";

import { enderecoPublicoDoSite, getCheckoutService } from "@/modules/checkout/services/server/checkoutServiceFactory";

import { lerCorpoJson, respostaDeErroPublica } from "@/modules/checkout/services/server/respostaPublica";

// Rota pública: fecha o pedido do site. O servidor valida tudo, refaz o preço e a entrega,
// guarda o pedido até o pagamento e devolve a página de pagamento do gateway. O pedido
// de verdade só nasce quando o pagamento é aprovado.
// Corpo: { cliente, endereco, itens, consentimentos } (preço e total que vierem são ignorados)
export async function POST(request: Request) {
  // 8 tentativas a cada 10 minutos por visitante (barra teste de cartão e abuso).
  const limite = limitarVisitante("checkout", request, 8, 600_000);

  if (limite) {
    return limite;
  }

  try {
    const aberto = await getCheckoutService(request).abrir(await lerCorpoJson(request), enderecoPublicoDoSite(request));

    return NextResponse.json({ sucesso: true, ...aberto });
  } catch (error) {
    return respostaDeErroPublica(error);
  }
}
