import { NextRequest, NextResponse } from "next/server";

import { getConferenciaMarketplaceService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Pedidos de marketplace e o resumo da conferência.
// ?status=AGUARDANDO|CONFERIDO (sem filtro: todos)
export async function GET(request: NextRequest) {
  try {
    const resultado = await getConferenciaMarketplaceService().listar(
      request.nextUrl.searchParams.get("status") || undefined
    );

    return NextResponse.json({ sucesso: true, ...resultado });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível listar a conferência dos marketplaces.");
  }
}
