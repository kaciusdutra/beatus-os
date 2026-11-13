import { NextResponse } from "next/server";

import { getKanbanService } from "@/modules/estoque/services/server/kanbanService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Prazos de validade (norma adotada, editável).
export async function GET() {
  try {
    const regras = await getKanbanService().listarRegras();

    return NextResponse.json({ sucesso: true, regras });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível listar as regras.", 500);
  }
}

// Corpo: { categoria, dias }
export async function PUT(request: Request) {
  try {
    const corpo = await request.json();

    await getKanbanService().salvarRegra(
      typeof corpo?.categoria === "string" ? corpo.categoria : "",
      Number(corpo?.dias),
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar a regra.");
  }
}
