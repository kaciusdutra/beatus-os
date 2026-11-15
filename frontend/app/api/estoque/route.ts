import { usuarioDosCabecalhos } from "@/core/auth/cabecalhos";

import { paraOPapel } from "@/core/permissions/semCustos";

import { NextResponse } from "next/server";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Saldo de cada insumo e de cada preparação.
export async function GET(request: Request) {
  try {
    const saldos = await getEstoqueService().listarSaldos();

    return NextResponse.json({ sucesso: true, saldos: paraOPapel(usuarioDosCabecalhos(request.headers)?.papel, saldos) });
  } catch (error) {
    return respostaDeErro(
      error,
      "Não foi possível carregar o estoque.",
      500
    );
  }
}
