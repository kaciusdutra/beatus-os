import { NextResponse } from "next/server";

import { getKanbanService } from "@/modules/estoque/services/server/kanbanService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

export async function GET() {
  try {
    const gavetas = await getKanbanService().listarGavetas();

    return NextResponse.json({ sucesso: true, gavetas });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível listar as gavetas.", 500);
  }
}

// Cria uma gaveta. Corpo: { nome, fichaTecnicaId?, capacidade? }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    await getKanbanService().criarGaveta({
      nome: typeof corpo?.nome === "string" ? corpo.nome : "",
      fichaTecnicaId:
        typeof corpo?.fichaTecnicaId === "string" && corpo.fichaTecnicaId
          ? corpo.fichaTecnicaId
          : undefined,
      capacidade:
        corpo?.capacidade === null ||
        corpo?.capacidade === "" ||
        corpo?.capacidade === undefined
          ? undefined
          : Number(corpo.capacidade),
      operador: operadorDaRequisicao(request),
    });

    return NextResponse.json({ sucesso: true }, { status: 201 });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível criar a gaveta.");
  }
}

// Edita ou inativa uma gaveta. Corpo: { id, nome?, fichaTecnicaId?, capacidade?, ativo? }
export async function PATCH(request: Request) {
  try {
    const corpo = await request.json();

    await getKanbanService().atualizarGaveta(
      typeof corpo?.id === "string" ? corpo.id : "",
      {
        nome: typeof corpo?.nome === "string" ? corpo.nome : undefined,
        fichaTecnicaId:
          corpo?.fichaTecnicaId === undefined
            ? undefined
            : corpo.fichaTecnicaId || null,
        capacidade:
          corpo?.capacidade === undefined
            ? undefined
            : corpo.capacidade === null || corpo.capacidade === ""
              ? null
              : Number(corpo.capacidade),
        ativo: typeof corpo?.ativo === "boolean" ? corpo.ativo : undefined,
      }
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar a gaveta.");
  }
}
