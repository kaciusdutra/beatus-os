import { NextRequest, NextResponse } from "next/server";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import type { ItemDeEstoque } from "@/modules/estoque/types/estoque";

// Histórico de movimentos de um item. ?itemTipo=INSUMO|PREPARACAO&id=...
export async function GET(request: NextRequest) {
  try {
    const itemTipo = request.nextUrl.searchParams.get("itemTipo");

    const id = request.nextUrl.searchParams.get("id");

    if ((itemTipo !== "INSUMO" && itemTipo !== "PREPARACAO") || !id) {
      throw new Error("Informe o tipo e o item.");
    }

    const movimentos = await getEstoqueService().historico(
      itemTipo as ItemDeEstoque,
      id
    );

    return NextResponse.json({ sucesso: true, movimentos });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível carregar o histórico.");
  }
}
