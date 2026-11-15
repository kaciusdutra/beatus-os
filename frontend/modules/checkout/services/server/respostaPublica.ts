import "server-only";

import { NextResponse } from "next/server";

import { CheckoutIndisponivel, ErroDeCheckout } from "../checkoutService";

// Erro de uma rota pública: o cliente só lê o que foi escrito para ele; o resto
// (banco, gateway, código) fica no log do servidor.
export function respostaDeErroPublica(error: unknown) {
  if (error instanceof ErroDeCheckout) {
    return NextResponse.json({ sucesso: false, mensagem: error.message }, { status: 400 });
  }

  if (error instanceof CheckoutIndisponivel) {
    return NextResponse.json({ sucesso: false, mensagem: error.message }, { status: 503 });
  }

  console.error("Erro no checkout do site:", error);

  return NextResponse.json({ sucesso: false, mensagem: "Não foi possível concluir agora. Tente de novo em instantes." }, { status: 500 });
}

export async function lerCorpoJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ErroDeCheckout("Pedido inválido.");
  }
}
