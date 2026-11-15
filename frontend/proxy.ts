import { NextResponse, type NextRequest } from "next/server";

import { CABECALHOS_DE_IDENTIDADE, COOKIE_DA_SESSAO, escreverCabecalhosDoUsuario } from "@/core/auth/cabecalhos";

import { possuiPermissao } from "@/core/permissions/permissionMatrix";

import { exigenciaDaRota, permissaoAtende } from "@/core/permissions/rotas";

import { AuthService } from "@/modules/acesso/services/authService";

import { criarAuthRepositoryPostgres } from "@/modules/acesso/repositories/postgres/authRepositoryPostgres";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

// O ponto único de controle de acesso. Roda antes de qualquer tela ou rota da
// API: confere se a pessoa entrou, se o perfil dela pode acessar o caminho
// (tabela em core/permissions/rotas.ts) e escreve quem ela é nos cabeçalhos que
// as telas e rotas leem. Cabeçalhos de identidade vindos de fora são apagados.

const METODOS_QUE_ALTERAM = ["POST", "PUT", "PATCH", "DELETE"];

function resposta(request: NextRequest, status: number, mensagem: string): NextResponse {
  return NextResponse.json({ sucesso: false, mensagem }, { status });
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  const ehApi = pathname.startsWith("/api/");

  // Ninguém se passa por outra pessoa: o que vier de fora com estes nomes é descartado.
  const cabecalhos = new Headers(request.headers);

  for (const nome of CABECALHOS_DE_IDENTIDADE) {
    cabecalhos.delete(nome);
  }

  // Pedido que altera dados e veio de outro site (CSRF) não passa.
  if (METODOS_QUE_ALTERAM.includes(request.method)) {
    const origem = request.headers.get("origin");

    if (origem) {
      let hostDaOrigem = "";

      try {
        hostDaOrigem = new URL(origem).host;
      } catch {
        hostDaOrigem = "";
      }

      if (hostDaOrigem !== request.headers.get("host")) {
        return resposta(request, 403, "Pedido recusado: ele não veio do próprio sistema.");
      }
    }
  }

  // O layout raiz usa o caminho para servir o site público sem o menu do sistema.
  cabecalhos.set("x-caminho", pathname);

  const { exige } = exigenciaDaRota(request.method, pathname);

  if (exige.tipo === "PUBLICA") {
    return NextResponse.next({ request: { headers: cabecalhos } });
  }

  const token = request.cookies.get(COOKIE_DA_SESSAO)?.value ?? "";

  let usuario = null;

  try {
    usuario = token ? await new AuthService(criarAuthRepositoryPostgres(criarContextoDesenvolvimento())).usuarioDoToken(token) : null;
  } catch (error) {
    console.error("Falha ao conferir a sessão:", error);

    // Sem conseguir conferir, nada passa.
    return ehApi
      ? resposta(request, 503, "Não foi possível conferir o seu acesso agora. Tente de novo.")
      : new NextResponse("Não foi possível conferir o seu acesso agora. Tente de novo em instantes.", { status: 503 });
  }

  if (!usuario) {
    if (ehApi) {
      return resposta(request, 401, "Entre no sistema para continuar.");
    }

    const destino = new URL("/login", request.url);

    if (pathname !== "/") {
      destino.searchParams.set("proximo", pathname + search);
    }

    return NextResponse.redirect(destino);
  }

  if (!permissaoAtende(exige, (permissao) => possuiPermissao(usuario.papel, permissao))) {
    if (ehApi) {
      return resposta(request, 403, "Seu perfil não tem acesso a isto.");
    }

    return NextResponse.redirect(new URL("/acesso-negado", request.url));
  }

  escreverCabecalhosDoUsuario(cabecalhos, usuario);

  return NextResponse.next({ request: { headers: cabecalhos } });
}

// Tudo passa pelo proxy, menos os arquivos estáticos (imagens, fontes, ícones).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|icone-beatus.svg|robots.txt|marca/|fonts/|site/).*)"],
};
