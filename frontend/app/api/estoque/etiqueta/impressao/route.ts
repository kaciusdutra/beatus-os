import { NextResponse } from "next/server";

import { getKanbanService } from "@/modules/estoque/services/server/kanbanService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Registra que uma etiqueta foi impressa. Corpo: { resumo, copias }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    await getKanbanService().registrarImpressaoDaEtiqueta(
      typeof corpo?.resumo === "string"
        ? corpo.resumo.slice(0, 200)
        : "etiqueta",
      Number(corpo?.copias) || 1,
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível registrar a impressão.");
  }
}
