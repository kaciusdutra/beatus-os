import { NextResponse } from "next/server";

import { COOKIE_DA_SESSAO } from "@/core/auth/cabecalhos";

import { getAuthService } from "@/modules/acesso/services/server/authServiceFactory";

import { apagarCookieDaSessao } from "@/modules/acesso/services/server/cookieDaSessao";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Sair: encerra esta entrada no banco e apaga o cookie.
export async function POST(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split(";").map((parte) => parte.trim()).find((parte) => parte.startsWith(`${COOKIE_DA_SESSAO}=`))?.slice(COOKIE_DA_SESSAO.length + 1) ?? "";

    await getAuthService().sair(decodeURIComponent(token));

    const resposta = NextResponse.json({ sucesso: true });

    apagarCookieDaSessao(resposta, request);

    return resposta;
  } catch (error) {
    return respostaDeErro(error, "Não foi possível sair.");
  }
}
