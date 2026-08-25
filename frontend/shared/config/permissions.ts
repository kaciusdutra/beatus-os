import { UserRole } from "@/shared/types/user";

export const permissions: Record<UserRole, string[]> = {
  administrador: [
    "dashboard",
    "operacao",
    "pedidos",
    "producao",
    "estoque",
    "financeiro",
    "inteligencia",
    "configuracoes",
  ],

  gerente: [
    "dashboard",
    "operacao",
    "pedidos",
    "producao",
    "estoque",
    "financeiro",
  ],

  cozinha: [
    "dashboard",
    "pedidos",
    "producao",
  ],

  caixa: [
    "dashboard",
    "pedidos",
    "financeiro",
  ],

  expedicao: [
    "dashboard",
    "pedidos",
  ],
};