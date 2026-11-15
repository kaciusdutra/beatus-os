import { NextResponse } from "next/server";

import { getAuthService } from "@/modules/acesso/services/server/authServiceFactory";

import { dispositivoDaRequisicao, gravarCookieDaSessao } from "@/modules/acesso/services/server/cookieDaSessao";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Cria o primeiro administrador e já o coloca para dentro. Só funciona enquanto
// não existir nenhum usuário; depois disso responde que já foi feito.
// Corpo: { nome, login, senha, email? }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    const servico = getAuthService();

    const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");

    const criado = await servico.primeiroAcesso({
      nome: texto(corpo?.nome),
      login: texto(corpo?.login),
      senha: texto(corpo?.senha),
      email: texto(corpo?.email) || undefined,
    });

    const entrada = await servico.entrar(criado.login, texto(corpo?.senha), dispositivoDaRequisicao(request));

    const resposta = NextResponse.json({ sucesso: true, usuario: entrada.usuario });

    gravarCookieDaSessao(resposta, request, entrada.token, entrada.expiraEm);

    return resposta;
  } catch (error) {
    return respostaDeErro(error, "Não foi possível criar o primeiro acesso.");
  }
}
