import { NextResponse } from "next/server";

import { getConferenciaMarketplaceService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Confere o repasse de um pedido de marketplace.
// Corpo: { valorRecebido, recebidoEm: "AAAA-MM-DD", observacao? }
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json();

    const pedido = await getConferenciaMarketplaceService().conferir(
      id,
      {
        valorRecebido: Number(String(corpo?.valorRecebido ?? "").replace(",", ".")),
        recebidoEm: typeof corpo?.recebidoEm === "string" ? corpo.recebidoEm : "",
        observacao: typeof corpo?.observacao === "string" ? corpo.observacao : undefined,
      },
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true, pedido });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível conferir o pedido.");
  }
}
