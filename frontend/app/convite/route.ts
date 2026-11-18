import { NextResponse } from "next/server";

import { destinoDoConvite } from "@/modules/clube/convite";

// O endereço curto que vai no QR impresso em cada pedido. Redireciona para a página de convite do site, levando a
// origem (iFood, 99Food, Keeta ou canais próprios) nos parâmetros de campanha. Como o QR aponta sempre para cá,
// o destino pode mudar sem reimprimir nada. Aceita só origens conhecidas (o resto vira "canais próprios").
export async function GET(request: Request) {
  const origem = new URL(request.url).searchParams.get("o");

  return NextResponse.redirect(new URL(destinoDoConvite(origem), request.url), 302);
}
