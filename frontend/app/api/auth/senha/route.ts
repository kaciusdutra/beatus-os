import { NextResponse } from "next/server";

import { usuarioDosCabecalhos } from "@/core/auth/cabecalhos";

import { getAuthService } from "@/modules/acesso/services/server/authServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Troca a própria senha. Corpo: { senhaAtual, novaSenha }. As outras entradas da pessoa são encerradas.
export async function POST(request: Request) {
  try {
    const usuario = usuarioDosCabecalhos(request.headers);

    if (!usuario) {
      return NextResponse.json({ sucesso: false, mensagem: "Entre no sistema para continuar." }, { status: 401 });
    }

    const corpo = await request.json();

    await getAuthService().trocarMinhaSenha(
      { id: usuario.id, login: usuario.login, nome: usuario.nome, papel: usuario.papel, sessaoId: usuario.sessaoId },
      typeof corpo?.senhaAtual === "string" ? corpo.senhaAtual : "",
      typeof corpo?.novaSenha === "string" ? corpo.novaSenha : ""
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível trocar a senha.");
  }
}
