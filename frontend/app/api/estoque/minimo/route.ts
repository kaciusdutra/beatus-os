import { NextResponse } from "next/server";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import type { ItemDeEstoque } from "@/modules/estoque/types/estoque";

// Estoque mínimo de um item. Corpo: { itemTipo, id, minimo } (minimo vazio remove)
export async function PUT(request: Request) {
  try {
    const corpo = await request.json();

    await getEstoqueService().definirMinimo(
      corpo?.itemTipo as ItemDeEstoque,
      typeof corpo?.id === "string" ? corpo.id : "",
      corpo?.minimo === null || corpo?.minimo === ""
        ? null
        : Number(corpo?.minimo)
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar o estoque mínimo.");
  }
}
