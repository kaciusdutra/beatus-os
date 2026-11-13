import { NextResponse } from "next/server";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Saldo de cada insumo e de cada preparação.
export async function GET() {
  try {
    const saldos = await getEstoqueService().listarSaldos();

    return NextResponse.json({ sucesso: true, saldos });
  } catch (error) {
    return respostaDeErro(
      error,
      "Não foi possível carregar o estoque.",
      500
    );
  }
}
