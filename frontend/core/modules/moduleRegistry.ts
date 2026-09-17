import {
  Permission,
} from "@/core/permissions/permissionTypes";

export type ModuleId =
  | "dashboard"
  | "pdv"
  | "checklist"
  | "pedidos"
  | "producao"
  | "estoque"
  | "compras"
  | "financeiro"
  | "inteligencia";

export interface ModuleDefinition {
  id: ModuleId;
  titulo: string;
  rota: string;
  icone: string;



  /**
   * Define se o módulo depende da operação
   * estar ativa para funcionar.
   */
  requerOperacao: boolean;

  /**
   * Permissão necessária para visualizar
   * o módulo.
   */
  permissaoVisualizacao: Permission;

  /**
   * Define se o módulo pertence ao
   * núcleo operacional do Beatus OS.
   */
  operacional: boolean;
}



export const moduleRegistry: ModuleDefinition[] = [
  {
    id: "dashboard",
    titulo: "Dashboard",
    rota: "/",
    icone: "🏠",
    requerOperacao: false,
    permissaoVisualizacao:
      "dashboard.visualizar",
    operacional: false,
  },

  {
    id: "pdv",
    titulo: "PDV",
    rota: "/pdv",
    icone: "🛒",
    requerOperacao: false,
    permissaoVisualizacao:
      "pdv.visualizar",
    operacional: false,
  },

  {
    id: "checklist",
    titulo: "Checklist",
    rota: "/operacao",
    icone: "📋",
    requerOperacao: false,
    permissaoVisualizacao:
      "operacao.visualizar",
    operacional: true,
  },

  {
    id: "pedidos",
    titulo: "Pedidos",
    rota: "/pedidos",
    icone: "📦",
    requerOperacao: true,
    permissaoVisualizacao:
      "pedidos.visualizar",
    operacional: true,
  },

  {
    id: "producao",
    titulo: "Produção",
    rota: "/producao",
    icone: "👨‍🍳",
    requerOperacao: true,
    permissaoVisualizacao:
      "producao.visualizar",
    operacional: true,
  },

  {
    id: "estoque",
    titulo: "Estoque",
    rota: "/estoque",
    icone: "🥩",
    requerOperacao: true,
    permissaoVisualizacao:
      "estoque.visualizar",
    operacional: true,
  },

  {
  id: "compras",
  titulo: "Compras",
  rota: "/compras",
  icone: "🛒",
  requerOperacao: false,
  permissaoVisualizacao: "compras.visualizar",
  operacional: false,
},

  {
    id: "financeiro",
    titulo: "Financeiro",
    rota: "/financeiro",
    icone: "💰",
    requerOperacao: true,
    permissaoVisualizacao:
      "financeiro.visualizar",
    operacional: false,
  },

  {
    id: "inteligencia",
    titulo: "Inteligência",
    rota: "/inteligencia",
    icone: "🧠",
    requerOperacao: true,
    permissaoVisualizacao:
      "inteligencia.visualizar",
    operacional: false,
  },
];