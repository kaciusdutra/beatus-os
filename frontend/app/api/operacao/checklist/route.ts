import { NextResponse } from "next/server";

import { getChecklistService } from "@/modules/operacao/services/server/checklistServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// O checklist de hoje (abertura e fechamento, ou produção). Cria o do dia, se ainda
// não existir, e avalia os itens automáticos.
export async function GET() {
  try {
    return NextResponse.json({ sucesso: true, checklist: await getChecklistService().doDia() });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler o checklist.");
  }
}
