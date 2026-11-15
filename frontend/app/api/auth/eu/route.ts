import { NextResponse } from "next/server";

import { usuarioDosCabecalhos } from "@/core/auth/cabecalhos";

// Quem está entrando (o proxy já conferiu a sessão e escreveu os cabeçalhos).
export async function GET(request: Request) {
  const usuario = usuarioDosCabecalhos(request.headers);

  if (!usuario) {
    return NextResponse.json({ sucesso: false, mensagem: "Entre no sistema para continuar." }, { status: 401 });
  }

  return NextResponse.json({ sucesso: true, usuario: { id: usuario.id, nome: usuario.nome, login: usuario.login, papel: usuario.papel } });
}
