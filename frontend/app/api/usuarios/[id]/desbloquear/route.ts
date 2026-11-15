import { NextResponse } from "next/server";

import { usuarioDosCabecalhos } from "@/core/auth/cabecalhos";

import { getAuthService } from "@/modules/acesso/services/server/authServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Tira o bloqueio por tentativas erradas.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ator = usuarioDosCabecalhos(request.headers);

    if (!ator) {
      return NextResponse.json({ sucesso: false, mensagem: "Entre no sistema para continuar." }, { status: 401 });
    }

    const { id } = await context.params;

    await getAuthService().desbloquear(id, { id: ator.id, nome: ator.nome });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível desbloquear.");
  }
}
