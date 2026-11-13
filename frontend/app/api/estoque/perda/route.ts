import { NextResponse } from "next/server";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

import type { ItemDeEstoque } from "@/modules/estoque/types/estoque";

// Perda (estragou, caiu, venceu). Corpo: { itemTipo, id, quantidade, motivo }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    await getEstoqueService().registrarPerda(
      corpo?.itemTipo as ItemDeEstoque,
      typeof corpo?.id === "string" ? corpo.id : "",
      Number(corpo?.quantidade),
      typeof corpo?.motivo === "string" ? corpo.motivo : "",
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível registrar a perda.");
  }
}
