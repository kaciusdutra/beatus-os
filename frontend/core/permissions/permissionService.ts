import {
  Permission,
  UserRole,
} from "./permissionTypes";

import {
  obterPermissoesDoPapel,
  possuiPermissao,
} from "./permissionMatrix";

import { currentUser } from "./currentUser";

export function obterUsuarioAtual() {
  return {
    ...currentUser,
  };
}

export function obterPapelAtual(): UserRole {
  return currentUser.papel;
}

export function obterPermissoesAtuais(): Permission[] {
  return obterPermissoesDoPapel(
    currentUser.papel
  );
}

export function pode(
  permissao: Permission
): boolean {
  return possuiPermissao(
    currentUser.papel,
    permissao
  );
}