import { NextResponse } from "next/server";

import { getAjustesService } from "@/modules/operacao/services/server/ajustesServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Dá o ajuste por resolvido (continua no histórico).
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const ajuste = await getAjustesService().resolver(id, operadorDaRequisicao(request));

    return NextResponse.json({ sucesso: true, ajuste });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível resolver o ajuste.");
  }
}
