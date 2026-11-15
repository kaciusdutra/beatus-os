import type { UserRole } from "@/core/permissions/permissionTypes";

// O cookie que leva o token da sessão (httpOnly: o JavaScript da tela não lê).
export const COOKIE_DA_SESSAO = "beatus_sessao";

// Quem está entrando, como o proxy informa às telas e rotas. SÓ o proxy escreve
// isto: ele apaga qualquer cabeçalho igual que venha de fora antes de preencher.
export const CABECALHO_USUARIO_ID = "x-usuario-id";
export const CABECALHO_USUARIO_NOME = "x-usuario-nome";
export const CABECALHO_USUARIO_LOGIN = "x-usuario-login";
export const CABECALHO_USUARIO_PAPEL = "x-usuario-papel";
export const CABECALHO_USUARIO_SESSAO = "x-usuario-sessao";

// O seletor provisório de operador (antes do login). Hoje é ignorado e apagado.
export const CABECALHO_OPERADOR_ANTIGO = "x-operador";

export const CABECALHOS_DE_IDENTIDADE = [
  CABECALHO_USUARIO_ID,
  CABECALHO_USUARIO_NOME,
  CABECALHO_USUARIO_LOGIN,
  CABECALHO_USUARIO_PAPEL,
  CABECALHO_USUARIO_SESSAO,
  CABECALHO_OPERADOR_ANTIGO,
];

export interface UsuarioAtual {
  id: string;
  nome: string;
  login: string;
  papel: UserRole;
}

const PAPEIS: UserRole[] = ["ADMIN", "GESTOR", "OPERADOR", "PRODUCAO", "FINANCEIRO"];

export function escreverCabecalhosDoUsuario(cabecalhos: Headers, usuario: UsuarioAtual & { sessaoId: string }): void {
  cabecalhos.set(CABECALHO_USUARIO_ID, usuario.id);
  cabecalhos.set(CABECALHO_USUARIO_NOME, encodeURIComponent(usuario.nome));
  cabecalhos.set(CABECALHO_USUARIO_LOGIN, usuario.login);
  cabecalhos.set(CABECALHO_USUARIO_PAPEL, usuario.papel);
  cabecalhos.set(CABECALHO_USUARIO_SESSAO, usuario.sessaoId);
}

export function usuarioDosCabecalhos(cabecalhos: Headers): (UsuarioAtual & { sessaoId: string }) | null {
  const id = cabecalhos.get(CABECALHO_USUARIO_ID);

  const papel = cabecalhos.get(CABECALHO_USUARIO_PAPEL) as UserRole | null;

  const nomeBruto = cabecalhos.get(CABECALHO_USUARIO_NOME);

  if (!id || !papel || !nomeBruto || !PAPEIS.includes(papel)) {
    return null;
  }

  let nome = nomeBruto;

  try {
    nome = decodeURIComponent(nomeBruto);
  } catch {
    // mantém como veio
  }

  return {
    id,
    nome,
    login: cabecalhos.get(CABECALHO_USUARIO_LOGIN) ?? "",
    papel,
    sessaoId: cabecalhos.get(CABECALHO_USUARIO_SESSAO) ?? "",
  };
}
