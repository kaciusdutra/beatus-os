import { NextResponse } from "next/server";

import { usuarioDosCabecalhos } from "@/core/auth/cabecalhos";

import { getAuthService } from "@/modules/acesso/services/server/authServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Muda nome, e-mail, perfil ou se o usuário está ativo. Corpo: { nome?, email?, papel?, ativo? }
export async function PUT(
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

    const usuario = await getAuthService().atualizarUsuario(
      id,
      {
        nome: typeof corpo?.nome === "string" ? corpo.nome : undefined,
        email: typeof corpo?.email === "string" ? corpo.email : corpo?.email === null ? null : undefined,
        papel: typeof corpo?.papel === "string" ? corpo.papel : undefined,
        ativo: typeof corpo?.ativo === "boolean" ? corpo.ativo : undefined,
      },
      { id: ator.id, nome: ator.nome }
    );

    return NextResponse.json({ sucesso: true, usuario });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível atualizar o usuário.");
  }
}
