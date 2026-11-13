import { NextResponse } from "next/server";

import { getContaPagarService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Posição, projeção e alertas do capital de giro.
export async function GET() {
  try {
    const servico = getContaPagarService();

    const [giro, configuracao] = await Promise.all([
      servico.capitalDeGiro(),
      servico.buscarConfiguracao(),
    ]);

    return NextResponse.json({ sucesso: true, giro, configuracao });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível calcular o capital de giro.");
  }
}
