import { NextResponse } from "next/server";

import { getIntegracaoMarketplaceService } from "@/modules/marketplace/services/server/integracaoMarketplaceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Configuração da integração de um canal (IFOOD, 99FOOD, KEETA). As credenciais
// ficam só no .env do servidor; aqui se vê apenas se estão preenchidas.
export async function GET(
  _request: Request,
  context: { params: Promise<{ canal: string }> }
) {
  try {
    const { canal } = await context.params;

    const [integracao, pendencias] = await Promise.all([
      getIntegracaoMarketplaceService().obterIntegracao(canal),
      getIntegracaoMarketplaceService().pendencias(),
    ]);

    return NextResponse.json({ sucesso: true, integracao, pendencias });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler a integração.");
  }
}

// Corpo: { ativo, aceiteAutomatico, modoSimulacao, idDaLoja? }
export async function PUT(
  request: Request,
  context: { params: Promise<{ canal: string }> }
) {
  try {
    const { canal } = await context.params;

    const corpo = await request.json();

    const integracao = await getIntegracaoMarketplaceService().salvarIntegracao(canal, {
      ativo: corpo?.ativo === true,
      aceiteAutomatico: corpo?.aceiteAutomatico !== false,
      modoSimulacao: corpo?.modoSimulacao !== false,
      idDaLoja: typeof corpo?.idDaLoja === "string" ? corpo.idDaLoja : undefined,
    });

    return NextResponse.json({ sucesso: true, integracao });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar a integração.");
  }
}
