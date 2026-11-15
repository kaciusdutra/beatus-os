import { NextResponse } from "next/server";

import { getChecklistService } from "@/modules/operacao/services/server/checklistServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// O estoque do dia para a abertura: o que falta, o que produzir, o que vence e o
// que está descongelando.
export async function GET() {
  try {
    return NextResponse.json({ sucesso: true, estoque: await getChecklistService().estoqueDoDia() });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler o estoque do dia.");
  }
}
