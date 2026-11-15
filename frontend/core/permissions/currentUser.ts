// LEGADO (S3): este usuário fixo foi substituído pelo usuário que entra no sistema
// (login e sessão). Não use: leia o usuário por useUsuario() nas telas e pelos
// cabeçalhos do proxy nas rotas. O arquivo fica até haver autorização para removê-lo.
import {
  SystemUser,
} from "./permissionTypes";

export const currentUser: SystemUser = {
  id: "user-001",
  nome: "Kacius",
  papel: "ADMIN",
};