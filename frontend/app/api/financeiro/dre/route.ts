import { NextRequest, NextResponse } from "next/server";

import { getDreService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

function mesAtual(): string {
  const agora = new Date();

  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

// DRE do mês. ?mes=AAAA-MM (padrão: mês atual)
export async function GET(request: NextRequest) {
  try {
    const dre = await getDreService().doMes(request.nextUrl.searchParams.get("mes") || mesAtual());

    return NextResponse.json({ sucesso: true, dre });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível montar a DRE.");
  }
}
