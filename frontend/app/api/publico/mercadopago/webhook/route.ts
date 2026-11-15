import { NextResponse } from "next/server";

import { limitarVisitante } from "@/core/seguranca/limitesPublicos";

import { validarAssinaturaMercadoPago } from "@/modules/checkout/services/assinaturaMercadoPago";

import { getCheckoutService, segredoDoWebhook } from "@/modules/checkout/services/server/checkoutServiceFactory";

// Aviso automático (webhook) do Mercado Pago. Rota pública, mas só vale com a assinatura
// certa (chave secreta do aplicativo). O corpo do aviso nunca é a verdade: o sistema
// pergunta ao Mercado Pago o que aconteceu. Responde 200 quando tratou e 500 quando falhou
// (o Mercado Pago repete o aviso).
export async function POST(request: Request) {
  const limite = limitarVisitante("mercadopago-webhook", request, 300, 60_000);

  if (limite) {
    return limite;
  }

  const segredo = segredoDoWebhook();

  if (!segredo) {
    // Sem a chave não dá para conferir quem enviou: nada é aceito.
    return NextResponse.json({ sucesso: false, mensagem: "Webhook não configurado." }, { status: 503 });
  }

  let corpo: Record<string, unknown> = {};

  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    corpo = {};
  }

  const url = new URL(request.url);

  const dados = (corpo.data ?? {}) as Record<string, unknown>;

  const dataId = url.searchParams.get("data.id") ?? (typeof dados.id === "string" || typeof dados.id === "number" ? String(dados.id) : null);

  const requestId = request.headers.get("x-request-id");

  if (!validarAssinaturaMercadoPago({ xSignature: request.headers.get("x-signature"), xRequestId: requestId, dataId, segredo })) {
    return NextResponse.json({ sucesso: false, mensagem: "Assinatura inválida." }, { status: 401 });
  }

  if (!dataId) {
    return NextResponse.json({ sucesso: true });
  }

  try {
    const tipo = typeof corpo.type === "string" ? corpo.type : (url.searchParams.get("type") ?? "");

    await getCheckoutService(request).tratarAviso({
      gateway: "MERCADO_PAGO",
      eventoId: requestId ?? `${tipo}:${dataId}:${typeof corpo.id === "string" || typeof corpo.id === "number" ? corpo.id : ""}`,
      tipo,
      dataId,
      corpo,
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("Falha ao tratar o aviso do Mercado Pago:", error);

    return NextResponse.json({ sucesso: false, mensagem: "Falha ao tratar o aviso." }, { status: 500 });
  }
}
