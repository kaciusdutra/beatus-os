import { NextResponse } from "next/server";

import { getChecklistService } from "@/modules/operacao/services/server/checklistServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Marca ou desmarca um item à mão. Corpo: { feito: boolean, observacao? }
// Item automático que o sistema ainda não confirma só se marca com observação.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json();

    await getChecklistService().marcarItem(
      id,
      corpo?.feito === true,
      typeof corpo?.observacao === "string" ? corpo.observacao : undefined,
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível marcar o item.");
  }
}
