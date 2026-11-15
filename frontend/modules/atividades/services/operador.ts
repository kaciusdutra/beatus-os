import { usuarioDosCabecalhos } from "@/core/auth/cabecalhos";

// Quem fez a ação, para o Registro de atividades: o usuário que entrou no
// sistema. O proxy confere a sessão e escreve o cabeçalho; um cabeçalho igual
// vindo de fora é apagado antes, então ninguém assina como outra pessoa.
export function operadorDaRequisicao(request: Request): string | null {
  return usuarioDosCabecalhos(request.headers)?.nome.trim().slice(0, 40) || null;
}
