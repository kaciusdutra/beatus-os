import { NextResponse } from "next/server";

import { getChecklistService } from "@/modules/operacao/services/server/checklistServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Conclui o checklist. Só com todos os itens obrigatórios cumpridos.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await getChecklistService().concluir(id, operadorDaRequisicao(request));

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível concluir o checklist.");
  }
}
