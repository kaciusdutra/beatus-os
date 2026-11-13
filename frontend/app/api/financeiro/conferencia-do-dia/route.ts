import { NextRequest, NextResponse } from "next/server";

import { getFinanceiroService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

function hoje(): string {
  const agora = new Date();

  const mes = String(agora.getMonth() + 1).padStart(2, "0");

  const dia = String(agora.getDate()).padStart(2, "0");

  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// Conferência do dia por canal. ?data=AAAA-MM-DD (padrão: hoje)
export async function GET(request: NextRequest) {
  try {
    const conferencia = await getFinanceiroService().conferenciaDoDia(
      request.nextUrl.searchParams.get("data") || hoje()
    );

    return NextResponse.json({ sucesso: true, conferencia });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível conferir o dia.");
  }
}
