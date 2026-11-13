import { NextResponse } from "next/server";

import { getFinanceiroService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Cancela um lançamento avulso (nunca apaga). Corpo: { motivo }
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json().catch(() => ({}));

    await getFinanceiroService().cancelarLancamento(
      id,
      typeof corpo?.motivo === "string" ? corpo.motivo : "",
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível cancelar o lançamento.");
  }
}
