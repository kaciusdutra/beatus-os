import type { DashboardRepositoryPort } from "../repositories/dashboardRepositoryPort";

import type { AlertaDoDashboard, DashboardDados } from "../types/dashboard";

import { montarEmOperacao, rankearProdutos, resumirDia } from "./calcularDashboard";

const DIAS_DO_RANKING = 7;

const MINUTOS_PARA_SER_PARADO = 10;

function texto(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const dia = String(data.getDate()).padStart(2, "0");

  return `${data.getFullYear()}-${mes}-${dia}`;
}

export class DashboardService {
  constructor(
    private readonly repository: DashboardRepositoryPort,
    // Avisos que vêm de outros módulos (financeiro, estoque). Cada um falha sozinho.
    private readonly fontesDeAlertas: (() => Promise<AlertaDoDashboard[]>)[] = []
  ) {}

  async carregar(
    agora: Date = new Date()
  ): Promise<DashboardDados & { novosParados: number }> {
    const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    const fimDoDia = new Date(inicioDoDia);

    fimDoDia.setDate(fimDoDia.getDate() + 1);

    const inicioDoRanking = new Date(inicioDoDia);

    inicioDoRanking.setDate(inicioDoRanking.getDate() - (DIAS_DO_RANKING - 1));

    const [periodo, emAndamento, alertas] = await Promise.all([
      this.repository.listarPedidos(inicioDoRanking, fimDoDia),
      this.repository.listarEmOperacao(),
      this.alertas(),
    ]);

    const doDia = periodo.filter(
      (pedido) => new Date(pedido.criadoEm) >= inicioDoDia
    );

    const contagem: Record<string, number> = {};

    for (const pedido of emAndamento) {
      contagem[pedido.status] = (contagem[pedido.status] ?? 0) + 1;
    }

    const limite = agora.getTime() - MINUTOS_PARA_SER_PARADO * 60000;

    const novosParados = emAndamento.filter(
      (pedido) => pedido.status === "NOVO" && new Date(pedido.criadoEm).getTime() < limite
    ).length;

    return {
      hoje: texto(agora),
      ...resumirDia(doDia),
      emOperacao: montarEmOperacao(contagem),
      diasDoRanking: DIAS_DO_RANKING,
      rankingProdutos: rankearProdutos(periodo, 5),
      alertas,
      atualizadoEm: agora.toISOString(),
      novosParados,
    };
  }

  private async alertas(): Promise<AlertaDoDashboard[]> {
    const resultados = await Promise.all(
      this.fontesDeAlertas.map(async (fonte) => {
        try {
          return await fonte();
        } catch (error) {
          // Um aviso que falha não derruba o dashboard.
          console.error("ERRO AO MONTAR UM ALERTA DO DASHBOARD:", error);

          return [];
        }
      })
    );

    return resultados.flat();
  }
}
