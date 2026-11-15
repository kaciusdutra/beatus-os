import { NextResponse } from "next/server";

import { getChecklistService } from "@/modules/operacao/services/server/checklistServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Reabre um checklist concluído, para corrigir um item.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await getChecklistService().reabrir(id, operadorDaRequisicao(request));

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível reabrir o checklist.");
  }
}
