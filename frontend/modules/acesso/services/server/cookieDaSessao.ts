import type { NextResponse } from "next/server";

import { COOKIE_DA_SESSAO } from "@/core/auth/cabecalhos";

// A conexão é segura (https)? Atrás de um proxy de hospedagem, vale o cabeçalho dele.
function conexaoSegura(request: Request): boolean {
  const encaminhado = request.headers.get("x-forwarded-proto");

  if (encaminhado) {
    return encaminhado.split(",")[0].trim() === "https";
  }

  return new URL(request.url).protocol === "https:";
}

// httpOnly: o JavaScript da tela não lê o token. SameSite=Lax: outro site não o envia
// em pedidos que alteram dados. Secure: só viaja por https quando a conexão é segura.
export function gravarCookieDaSessao(resposta: NextResponse, request: Request, token: string, expiraEm: Date): void {
  resposta.cookies.set({
    name: COOKIE_DA_SESSAO,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: conexaoSegura(request),
    path: "/",
    expires: expiraEm,
  });
}

export function apagarCookieDaSessao(resposta: NextResponse, request: Request): void {
  resposta.cookies.set({
    name: COOKIE_DA_SESSAO,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: conexaoSegura(request),
    path: "/",
    expires: new Date(0),
  });
}

export function dispositivoDaRequisicao(request: Request): string | undefined {
  return request.headers.get("user-agent")?.slice(0, 200) || undefined;
}
