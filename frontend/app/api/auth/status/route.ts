import { NextResponse } from "next/server";

import { getAuthService } from "@/modules/acesso/services/server/authServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Público: diz só se o sistema ainda precisa do primeiro acesso (nenhum usuário criado).
export async function GET() {
  try {
    return NextResponse.json({ sucesso: true, precisaDePrimeiroAcesso: await getAuthService().precisaDePrimeiroAcesso() });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível conferir o acesso.", 500);
  }
}
