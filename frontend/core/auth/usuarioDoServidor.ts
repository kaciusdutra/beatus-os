import "server-only";

import { headers } from "next/headers";

import { usuarioDosCabecalhos, type UsuarioAtual } from "./cabecalhos";

// Quem está logado, para as telas que rodam no servidor (layouts e páginas).
// O proxy já conferiu a sessão e escreveu os cabeçalhos.
export async function usuarioAtualDoServidor(): Promise<UsuarioAtual | null> {
  const usuario = usuarioDosCabecalhos(await headers());

  return usuario ? { id: usuario.id, nome: usuario.nome, login: usuario.login, papel: usuario.papel } : null;
}
