export type UserRole =
  | "administrador"
  | "gerente"
  | "cozinha"
  | "caixa"
  | "expedicao";

export interface User {
  id: string;
  nome: string;
  role: UserRole;
}