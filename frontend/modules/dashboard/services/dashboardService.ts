import { DashboardMetrics } from "../types/dashboard";

export function getDashboardMetrics(): DashboardMetrics {
  const pedidosHoje = 18;
  const emProducao = 4;
  const entregues = 14;
  const faturamento = 1864.5;

  const ticketMedio =
    pedidosHoje > 0
      ? faturamento / pedidosHoje
      : 0;

  return {
    pedidosHoje,
    emProducao,
    entregues,
    faturamento,
    ticketMedio,
  };
}