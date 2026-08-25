export type UserRole =
  | "ADMIN"
  | "GESTOR"
  | "OPERADOR"
  | "PRODUCAO"
  | "FINANCEIRO";

export type Permission =
  | "dashboard.visualizar"
  | "operacao.visualizar"
  | "pedidos.visualizar"
  | "pedidos.gerenciar"
  | "producao.visualizar"
  | "producao.gerenciar"
  | "estoque.visualizar"
  | "estoque.gerenciar"
  | "financeiro.visualizar"
  | "financeiro.gerenciar"
  | "inteligencia.visualizar"
  | "configuracoes.visualizar"
  | "configuracoes.gerenciar"
  | "pdv.visualizar"
  | "pdv.gerenciar";

export interface SystemUser {
  id: string;
  nome: string;
  papel: UserRole;
}