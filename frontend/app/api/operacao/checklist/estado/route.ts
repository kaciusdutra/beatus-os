import { NextResponse } from "next/server";

import { getChecklistService } from "@/modules/operacao/services/server/checklistServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Leve: só diz se o checklist de abertura e o de fechamento de hoje já foram
// concluídos. O sistema todo consulta isto para saber o estado da operação.
export async function GET() {
  try {
    return NextResponse.json({ sucesso: true, estado: await getChecklistService().estado() });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler o estado do checklist.");
  }
}
