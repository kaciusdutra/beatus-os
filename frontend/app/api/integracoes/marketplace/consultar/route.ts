import { NextResponse } from "next/server";

import { getIntegracaoMarketplaceService } from "@/modules/marketplace/services/server/integracaoMarketplaceFactory";

import { CANAIS_MARKETPLACE } from "@/modules/marketplace/types/marketplace";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Consulta todas as plataformas ligadas (a Cozinha chama a cada 30 segundos).
// Plataforma desligada ou em simulação não faz nada.
export async function POST() {
  try {
    const servico = getIntegracaoMarketplaceService();

    const resultados: Record<string, { consultados: number; motivo?: string; falha?: string }> = {};

    for (const canal of CANAIS_MARKETPLACE) {
      resultados[canal] = await servico.consultar(canal);
    }

    return NextResponse.json({ sucesso: true, resultados });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível consultar as plataformas.");
  }
}
