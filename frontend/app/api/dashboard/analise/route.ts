import { NextRequest, NextResponse } from "next/server";

import { getDashboardService } from "@/modules/dashboard/services/server/dashboardServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Vendas por canal e por produto nos últimos N dias (?dias=30), com a margem
// do preço praticado e as etiquetas de promoção e divulgação.
export async function GET(request: NextRequest) {
  try {
    const dias = Number(request.nextUrl.searchParams.get("dias"));

    const analise = await getDashboardService().analisarVendas(
      Number.isFinite(dias) && dias > 0 ? dias : 30
    );

    return NextResponse.json({ sucesso: true, analise });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível analisar as vendas.");
  }
}
