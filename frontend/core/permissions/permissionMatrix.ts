import {
  Permission,
  UserRole,
} from "./permissionTypes";

const permissoesPorPapel: Record<
  UserRole,
  Permission[]
> = {
  ADMIN: [
    "dashboard.visualizar",
    "pdv.visualizar",
    "pdv.gerenciar",
    "operacao.visualizar",
    "pedidos.visualizar",
    "pedidos.gerenciar",
    "producao.visualizar",
    "producao.gerenciar",
    "estoque.visualizar",
    "estoque.gerenciar",
    "financeiro.visualizar",
    "financeiro.gerenciar",
    "inteligencia.visualizar",
    "configuracoes.visualizar",
    "configuracoes.gerenciar",
  ],

  GESTOR: [
    "dashboard.visualizar",
    "pdv.visualizar",
    "pdv.gerenciar",
    "operacao.visualizar",
    "pedidos.visualizar",
    "pedidos.gerenciar",
    "producao.visualizar",
    "producao.gerenciar",
    "estoque.visualizar",
    "estoque.gerenciar",
    "financeiro.visualizar",
    "financeiro.gerenciar",
    "inteligencia.visualizar",
    "configuracoes.visualizar",
  ],

  OPERADOR: [
    "dashboard.visualizar",
    "pdv.visualizar",
    "pdv.gerenciar",
    "operacao.visualizar",
    "pedidos.visualizar",
    "pedidos.gerenciar",
    "producao.visualizar",
    "estoque.visualizar",
    "inteligencia.visualizar",
  ],

  PRODUCAO: [
    "dashboard.visualizar",
    "operacao.visualizar",
    "pedidos.visualizar",
    "producao.visualizar",
    "producao.gerenciar",
    "estoque.visualizar",
  ],

  FINANCEIRO: [
    "dashboard.visualizar",
    "financeiro.visualizar",
    "financeiro.gerenciar",
    "inteligencia.visualizar",
  ],
};

export function obterPermissoesDoPapel(
  papel: UserRole
): Permission[] {
  return [
    ...permissoesPorPapel[papel],
  ];
}

export function possuiPermissao(
  papel: UserRole,
  permissao: Permission
): boolean {
  return permissoesPorPapel[papel].includes(
    permissao
  );
}