import { NextRequest, NextResponse } from "next/server";

import { getContaPagarService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Títulos a pagar. ?status=ABERTO|PAGO|CANCELADO (sem filtro: todos)
export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");

    const titulos = await getContaPagarService().listar(
      status === "ABERTO" || status === "PAGO" || status === "CANCELADO"
        ? status
        : undefined
    );

    return NextResponse.json({ sucesso: true, titulos });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível listar as contas a pagar.");
  }
}
