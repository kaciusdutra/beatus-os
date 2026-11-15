import { NextResponse } from "next/server";

import { getHorarioService } from "@/modules/operacao/services/server/horarioServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Remove uma exceção; o dia volta ao horário normal da semana.
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await getHorarioService().removerExcecao(id, operadorDaRequisicao(request));

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível remover a exceção.");
  }
}
