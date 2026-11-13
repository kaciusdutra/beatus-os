import { NextResponse } from "next/server";

import { getKanbanService } from "@/modules/estoque/services/server/kanbanService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Quadro kanban do estoque: cartões por lugar e preparações a produzir.
export async function GET() {
  try {
    const quadro = await getKanbanService().quadro();

    return NextResponse.json({ sucesso: true, ...quadro });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível carregar o quadro.", 500);
  }
}
