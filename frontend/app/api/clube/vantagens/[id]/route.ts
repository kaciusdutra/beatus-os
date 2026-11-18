import { NextResponse } from "next/server";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { salvarVantagem } from "@/modules/clube/services/server/vantagemService";

import { validarVantagem } from "@/modules/clube/vantagens";

// Muda uma vantagem do catálogo (inclusive desativar). O que o cliente já escolheu não muda: o resgate guarda uma cópia.
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const validacao = validarVantagem(await request.json());

    if (!validacao.ok) {
      return NextResponse.json({ sucesso: false, mensagem: validacao.erro }, { status: 422 });
    }

    return NextResponse.json({ sucesso: true, vantagem: await salvarVantagem(validacao.dados, id) });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar a vantagem.");
  }
}
