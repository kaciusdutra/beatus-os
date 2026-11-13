import type { PedidoParaDashboard } from "../types/dashboard";

// Porta de leitura do dashboard. O serviço só conhece esta interface; o Prisma
// fica na implementação em ./postgres.
export interface DashboardRepositoryPort {
  // Pedidos criados no período [de, ate), de qualquer situação, com os itens.
  listarPedidos(de: Date, ate: Date): Promise<PedidoParaDashboard[]>;

  // Pedidos ainda em andamento (novo, em preparo, pronto, em rota), de qualquer dia.
  listarEmOperacao(): Promise<{ status: string; criadoEm: string }[]>;
}
