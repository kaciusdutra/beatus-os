import { Permission } from "@/core/permissions/permissionTypes";

export interface MenuItem {
  id: string;
  titulo: string;
  rota: string;
  icone: string;

  /**
   * Permissão necessária para visualizar
   * o módulo no menu.
   */
  permissao?: Permission;

  /**
   * Indica se o módulo depende da operação
   * estar ativa para ser utilizado.
   */
  requerOperacao: boolean;
}