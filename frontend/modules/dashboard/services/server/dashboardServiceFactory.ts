import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { getContaPagarService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { getConferenciaMarketplaceService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { criarPrecificacaoServicePostgres } from "@/modules/precificacao/services/server/precificacaoServiceFactory";

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

async function alertasDaConferencia(): Promise<AlertaDoDashboard[]> {
  const { resumo } = await getConferenciaMarketplaceService().listar();

  if (resumo.aguardando.quantidade === 0) {
    return [];
  }

  return [
    {
      nivel: "INFO",
      mensagem: `${resumo.aguardando.quantidade} pedido(s) de marketplace aguardando conferência do repasse (R$ ${resumo.aguardando.esperado.toFixed(2).replace(".", ",")} esperados).`,
      href: "/financeiro/conferencia-marketplace",
    },
  ];
}

async function margensDaPrecificacao() {
  const precificacao = criarPrecificacaoServicePostgres();

  const [precos, parametros] = await Promise.all([
    precificacao.listarPrecos(),
    precificacao.buscarParametros(),
  ]);

  return {
    margens: precos.map((preco) => ({
      produtoId: preco.produtoId,
      canal: preco.canal,
      margemPercentual: preco.margemReferencia,
    })),
    margemMinimaPercentual: parametros.margemMinimaPercentual,
  };
}

export function getDashboardService(): DashboardService {
  return new DashboardService(
    criarDashboardRepositoryPostgres(criarContextoDesenvolvimento()),
    [alertasDoFinanceiro, alertasDoEstoque, alertasDaConferencia],
    margensDaPrecificacao
  );
}
