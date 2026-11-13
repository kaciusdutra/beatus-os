import { NextRequest, NextResponse } from "next/server";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// O que a produção vai consumir e como ficam os saldos. ?fichaId=...&quantidade=...
export async function GET(request: NextRequest) {
  try {
    const fichaId = request.nextUrl.searchParams.get("fichaId") ?? "";

    const quantidade = Number(
      request.nextUrl.searchParams.get("quantidade")
    );

    const previsao = await getEstoqueService().previsaoDeProducao(
      fichaId,
      quantidade
    );

    return NextResponse.json({ sucesso: true, previsao });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível calcular a produção.");
  }
}
