import { NextResponse } from "next/server";

import { getPixService } from "@/modules/pix/services/server/pixServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Pix de R$ 1,00 para o Kacius colar no próprio banco e conferir nome e valor.
export async function GET() {
  try {
    return NextResponse.json({ sucesso: true, cobranca: await getPixService().gerarTeste() });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível gerar o Pix de teste.");
  }
}
