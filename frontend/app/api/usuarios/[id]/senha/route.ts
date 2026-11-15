import { NextResponse } from "next/server";

import { usuarioDosCabecalhos } from "@/core/auth/cabecalhos";

import { getAuthService } from "@/modules/acesso/services/server/authServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// O administrador define uma senha nova para a pessoa. Corpo: { novaSenha }. Encerra as entradas dela.
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

    const corpo = await request.json();

    await getAuthService().redefinirSenha(id, typeof corpo?.novaSenha === "string" ? corpo.novaSenha : "", { id: ator.id, nome: ator.nome });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível redefinir a senha.");
  }
}
