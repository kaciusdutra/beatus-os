import { NextResponse } from "next/server";

import { getBeatrizService } from "@/modules/beatriz/services/server/beatrizServiceFactory";

import { ErroDaBeatriz } from "@/modules/beatriz/modelos/modeloPort";

import type { CanalPedido } from "@/modules/pedidos/types/pedido";

// A Beatriz responde ao cliente e anota o pedido (conferido com o cardápio).
// Corpo: { mensagens: [{ papel: "cliente" | "beatriz", texto }], canal?, rascunhoAtual? }
// A conversa fica com quem chama: nada é guardado aqui.
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    const resposta = await getBeatrizService().responder({
      mensagens: Array.isArray(corpo?.mensagens) ? corpo.mensagens : [],
      canal: typeof corpo?.canal === "string" ? (corpo.canal as CanalPedido) : undefined,
      rascunhoAtual: corpo?.rascunhoAtual && typeof corpo.rascunhoAtual === "object" ? corpo.rascunhoAtual : undefined,
    });

    return NextResponse.json({ sucesso: true, resposta });
  } catch (error) {
    if (error instanceof ErroDaBeatriz) {
      return NextResponse.json({ sucesso: false, mensagem: error.message, codigo: error.codigo }, { status: error.status });
    }

    console.error("ERRO NA ROTA DA BEATRIZ:", error);

    return NextResponse.json({ sucesso: false, mensagem: "Não foi possível falar com a Beatriz." }, { status: 500 });
  }
}
