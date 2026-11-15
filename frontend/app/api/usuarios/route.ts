import { NextResponse } from "next/server";

import { usuarioDosCabecalhos } from "@/core/auth/cabecalhos";

import { getAuthService } from "@/modules/acesso/services/server/authServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Lista de usuários (só o administrador chega aqui; o proxy confere).
export async function GET() {
  try {
    return NextResponse.json({ sucesso: true, usuarios: await getAuthService().listarUsuarios() });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler os usuários.");
  }
}

// Cria um usuário. Corpo: { nome, login, email?, papel, senha }
export async function POST(request: Request) {
  try {
    const ator = usuarioDosCabecalhos(request.headers);

    if (!ator) {
      return NextResponse.json({ sucesso: false, mensagem: "Entre no sistema para continuar." }, { status: 401 });
    }

    const corpo = await request.json();

    const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");

    const usuario = await getAuthService().criarUsuario(
      { nome: texto(corpo?.nome), login: texto(corpo?.login), email: texto(corpo?.email) || undefined, papel: texto(corpo?.papel), senha: texto(corpo?.senha) },
      { id: ator.id, nome: ator.nome }
    );

    return NextResponse.json({ sucesso: true, usuario });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível criar o usuário.");
  }
}
