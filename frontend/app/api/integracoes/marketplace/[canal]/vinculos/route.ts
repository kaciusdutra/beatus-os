import { NextResponse } from "next/server";

import { getIntegracaoMarketplaceService } from "@/modules/marketplace/services/server/integracaoMarketplaceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Itens da plataforma e o produto do Beatus a que cada um está ligado.
export async function GET(
  _request: Request,
  context: { params: Promise<{ canal: string }> }
) {
  try {
    const { canal } = await context.params;

    const vinculos = await getIntegracaoMarketplaceService().listarVinculos(canal);

    return NextResponse.json({ sucesso: true, vinculos });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível listar os vínculos.");
  }
}

// Liga (ou desliga) um item a um produto. Corpo: { id, produtoId | null }
export async function PATCH(request: Request) {
  try {
    const corpo = await request.json();

    const vinculo = await getIntegracaoMarketplaceService().ligarVinculo(
      typeof corpo?.id === "string" ? corpo.id : "",
      typeof corpo?.produtoId === "string" && corpo.produtoId ? corpo.produtoId : null
    );

    return NextResponse.json({ sucesso: true, vinculo });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ligar o item.");
  }
}
