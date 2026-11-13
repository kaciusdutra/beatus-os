import { NextResponse } from "next/server";

import { getKanbanService } from "@/modules/estoque/services/server/kanbanService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

export async function GET() {
  try {
    const configuracao = await getKanbanService().obterConfiguracao();

    return NextResponse.json({ sucesso: true, configuracao });
  } catch (error) {
    return respostaDeErro(
      error,
      "Não foi possível carregar as temperaturas.",
      500
    );
  }
}

// Corpo: { temperaturaFreezerC, temperaturaGeladeiraC } (vazio = não medida)
export async function PUT(request: Request) {
  try {
    const corpo = await request.json();

    const numeroOuNulo = (valor: unknown) =>
      valor === null || valor === "" || valor === undefined
        ? null
        : Number(valor);

    await getKanbanService().salvarTemperaturas(
      numeroOuNulo(corpo?.temperaturaFreezerC),
      numeroOuNulo(corpo?.temperaturaGeladeiraC),
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar as temperaturas.");
  }
}
