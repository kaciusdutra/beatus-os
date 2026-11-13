import { NextResponse } from "next/server";

import { getContaPagarService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Paga um título. Corpo: { pagoEm: "AAAA-MM-DD", valorPago, forma: "PIX"|"DINHEIRO"|"CARTAO" }
// O valor pago pode diferir do original (juros, multa, desconto).
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json();

    const titulo = await getContaPagarService().pagar(
      id,
      {
        pagoEm: typeof corpo?.pagoEm === "string" ? corpo.pagoEm : "",
        valorPago: Number(String(corpo?.valorPago ?? "").replace(",", ".")),
        forma: typeof corpo?.forma === "string" ? corpo.forma : "",
      },
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true, titulo });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível pagar o título.");
  }
}
