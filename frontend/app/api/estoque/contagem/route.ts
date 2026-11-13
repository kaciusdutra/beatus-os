import { NextResponse } from "next/server";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

import type { ItemDeEstoque } from "@/modules/estoque/types/estoque";

// Inventário: o que foi contado vira o saldo; a diferença é o ajuste.
// Corpo: { itemTipo, id, contado, motivo }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    const resultado = await getEstoqueService().ajustarPorContagem(
      corpo?.itemTipo as ItemDeEstoque,
      typeof corpo?.id === "string" ? corpo.id : "",
      Number(corpo?.contado),
      typeof corpo?.motivo === "string" ? corpo.motivo : "",
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true, ...resultado });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível registrar a contagem.");
  }
}
