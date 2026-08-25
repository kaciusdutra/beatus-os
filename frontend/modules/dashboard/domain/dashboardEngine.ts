import { DashboardMetrics } from "../types/dashboard";

export interface DashboardInsight {
  mensagem: string;
  nivel: "info" | "warning" | "danger";
}

export function analisarDashboard(
  metrics: DashboardMetrics
): DashboardInsight {

  if (metrics.pedidosHoje === 0) {
    return {
      mensagem: "Nenhum pedido recebido até o momento.",
      nivel: "info",
    };
  }

  if (metrics.emProducao > 10) {
    return {
      mensagem: "A cozinha está sobrecarregada.",
      nivel: "warning",
    };
  }

  return {
    mensagem: "Operação funcionando normalmente.",
    nivel: "info",
  };
}