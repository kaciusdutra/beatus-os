import { NextRequest, NextResponse } from "next/server";

import { getFinanceiroService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

function hoje(): string {
  const agora = new Date();

  const mes = String(agora.getMonth() + 1).padStart(2, "0");

  const dia = String(agora.getDate()).padStart(2, "0");

  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// Fluxo de caixa do período. ?de=AAAA-MM-DD&ate=AAAA-MM-DD (padrão: hoje)
// Traz também os lançamentos avulsos do período (com os cancelados).
export async function GET(request: NextRequest) {
  try {
    const de = request.nextUrl.searchParams.get("de") || hoje();

    const ate = request.nextUrl.searchParams.get("ate") || de;

    const servico = getFinanceiroService();

    const [fluxo, lancamentos] = await Promise.all([
      servico.fluxoDeCaixa(de, ate),
      servico.listarLancamentos(de, ate),
    ]);

    return NextResponse.json({ sucesso: true, fluxo, lancamentos });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível calcular o fluxo de caixa.");
  }
}
