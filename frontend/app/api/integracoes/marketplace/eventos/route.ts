import { NextRequest, NextResponse } from "next/server";

import { getIntegracaoMarketplaceService } from "@/modules/marketplace/services/server/integracaoMarketplaceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Últimos eventos recebidos. ?canal=IFOOD&limite=30
export async function GET(request: NextRequest) {
  try {
    const limite = Number(request.nextUrl.searchParams.get("limite"));

    const eventos = await getIntegracaoMarketplaceService().listarEventos(
      request.nextUrl.searchParams.get("canal") || undefined,
      Number.isFinite(limite) && limite > 0 ? Math.min(limite, 100) : 30
    );

    return NextResponse.json({ sucesso: true, eventos });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível listar os eventos.");
  }
}
