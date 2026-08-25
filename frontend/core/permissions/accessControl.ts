import { Permission } from "./permissionTypes";
import { pode } from "./permissionService";

export interface AccessResult {
  permitido: boolean;
  motivo:
    | "AUTORIZADO"
    | "SEM_PERMISSAO";
}

export function verificarAcesso(
  permissao?: Permission
): AccessResult {
  if (!permissao) {
    return {
      permitido: true,
      motivo: "AUTORIZADO",
    };
  }

  const autorizado = pode(permissao);

  if (!autorizado) {
    return {
      permitido: false,
      motivo: "SEM_PERMISSAO",
    };
  }

  return {
    permitido: true,
    motivo: "AUTORIZADO",
  };
}