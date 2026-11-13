import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { getContaPagarService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import { DashboardService } from "../dashboardService";

import { criarDashboardRepositoryPostgres } from "../../repositories/postgres/dashboardRepositoryPostgres";

import type { AlertaDoDashboard } from "../../types/dashboard";

// Do capital de giro entram só os avisos que pedem ação agora.
const CODIGOS_DO_FINANCEIRO = ["VENCIDO", "VENCE_HOJE", "VENCE_EM_3_DIAS", "CAIXA_NEGATIVO"];

async function alertasDoFinanceiro(): Promise<AlertaDoDashboard[]> {
  const giro = await getContaPagarService().capitalDeGiro();

  return giro.alertas
    .filter((alerta) => CODIGOS_DO_FINANCEIRO.includes(alerta.codigo))
    .map((alerta) => ({
      nivel: alerta.nivel,
      mensagem: alerta.mensagem,
      href:
        alerta.codigo === "CAIXA_NEGATIVO"
          ? "/financeiro/capital-de-giro"
          : "/financeiro/contas-a-pagar",
    }));
}

async function alertasDoEstoque(): Promise<AlertaDoDashboard[]> {
  const saldos = await getEstoqueService().listarSaldos();

  const abaixo = saldos.filter((saldo) => saldo.abaixoDoMinimo);

  if (abaixo.length === 0) {
    return [];
  }

  return [
    {
      nivel: "ATENCAO",
      mensagem: `${abaixo.length} item(ns) de estoque abaixo do mínimo: ${abaixo
        .slice(0, 3)
        .map((saldo) => saldo.nome)
        .join(", ")}${abaixo.length > 3 ? "..." : ""}.`,
      href: "/estoque",
    },
  ];
}

export function getDashboardService(): DashboardService {
  return new DashboardService(
    criarDashboardRepositoryPostgres(criarContextoDesenvolvimento()),
    [alertasDoFinanceiro, alertasDoEstoque]
  );
}
