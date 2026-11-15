import type { UserRole } from "@/core/permissions/permissionTypes";

export type PapelDoUsuario = UserRole;

export const PAPEIS: PapelDoUsuario[] = ["ADMIN", "GESTOR", "OPERADOR", "PRODUCAO", "FINANCEIRO"];

export const ROTULO_DO_PAPEL: Record<PapelDoUsuario, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERADOR: "Operador de caixa",
  PRODUCAO: "Produção",
  FINANCEIRO: "Financeiro",
};

// Como o usuário vive no banco (com o hash da senha; nunca sai do servidor).
export interface UsuarioSalvo {
  id: string;
  empresaId: string;
  login: string;
  nome: string;
  email?: string;
  papel: PapelDoUsuario;
  senhaHash: string;
  ativo: boolean;
  tentativasFalhas: number;
  bloqueadoAte?: Date;
  ultimoAcessoEm?: Date;
  criadoEm: Date;
}

// O que as telas recebem: sem senha, sem contagem de tentativas.
export interface UsuarioPublico {
  id: string;
  login: string;
  nome: string;
  email?: string;
  papel: PapelDoUsuario;
  ativo: boolean;
  bloqueadoAte?: string;
  ultimoAcessoEm?: string;
  criadoEm: string;
}

// Quem está entrando, como o proxy e as rotas enxergam.
export interface UsuarioDaSessao {
  id: string;
  login: string;
  nome: string;
  papel: PapelDoUsuario;
  sessaoId: string;
}

export interface SessaoSalva {
  id: string;
  usuarioId: string;
  expiraEm: Date;
  ultimoUsoEm: Date;
  revogadaEm?: Date;
}

// Quem faz a ação (para o Registro de atividades e para as travas de segurança).
export interface Ator {
  id: string;
  nome: string;
}
