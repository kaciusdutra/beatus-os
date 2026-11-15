"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { UsuarioAtual } from "@/core/auth/cabecalhos";

import { possuiPermissao } from "@/core/permissions/permissionMatrix";

import type { Permission } from "@/core/permissions/permissionTypes";

// Quem está entrando, entregue pelo servidor já no primeiro desenho da tela
// (sem piscar o menu trancado). Nas telas de entrada (login) é nulo.
const UsuarioContext = createContext<UsuarioAtual | null>(null);

export function UsuarioProvider({ usuario, children }: { usuario: UsuarioAtual | null; children: ReactNode }) {
  return <UsuarioContext.Provider value={usuario}>{children}</UsuarioContext.Provider>;
}

export function useUsuario(): UsuarioAtual | null {
  return useContext(UsuarioContext);
}

// O perfil de quem entrou tem esta permissão? Sem usuário, não.
export function usePode(permissao: Permission): boolean {
  const usuario = useUsuario();

  return usuario ? possuiPermissao(usuario.papel, permissao) : false;
}
