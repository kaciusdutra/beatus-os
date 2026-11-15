import { NextResponse } from "next/server";

import { getAuthService } from "@/modules/acesso/services/server/authServiceFactory";

import { apagarCookieDaSessao, dispositivoDaRequisicao, gravarCookieDaSessao } from "@/modules/acesso/services/server/cookieDaSessao";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Entrar. Corpo: { login, senha }. Grava o cookie da sessão.
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    const entrada = await getAuthService().entrar(
      typeof corpo?.login === "string" ? corpo.login : "",
      typeof corpo?.senha === "string" ? corpo.senha : "",
      dispositivoDaRequisicao(request)
    );

    const resposta = NextResponse.json({ sucesso: true, usuario: entrada.usuario });

    gravarCookieDaSessao(resposta, request, entrada.token, entrada.expiraEm);

    return resposta;
  } catch (error) {
    const resposta = respostaDeErro(error, "Não foi possível entrar.", 401);

    apagarCookieDaSessao(resposta, request);

    return resposta;
  }
}
