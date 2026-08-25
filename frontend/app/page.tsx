import GreetingCard from "@/modules/dashboard/components/GreetingCard";
import OperationOverviewCard from "@/modules/dashboard/components/OperationOverviewCard";
import MetricsCard from "@/modules/dashboard/components/MetricsCard";
import InsightCard from "@/modules/dashboard/components/InsightCard";

import { getDashboardMetrics } from "@/modules/dashboard/services/dashboardService";
import { analisarDashboard } from "@/modules/dashboard/domain/dashboardEngine";

export default function Home() {
  const metrics = getDashboardMetrics();
  const insight = analisarDashboard(metrics);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {/* Cabeçalho operacional */}
      <section className="shrink-0">
        <GreetingCard />
      </section>

      {/* Estado da operação */}
      <section className="shrink-0">
        <OperationOverviewCard />
      </section>

      {/* Indicadores principais */}
      <section className="grid shrink-0 grid-cols-2 gap-4 xl:grid-cols-5">
        <MetricsCard
          titulo="Pedidos Hoje"
          valor={metrics.pedidosHoje}
        />

        <MetricsCard
          titulo="Em Produção"
          valor={metrics.emProducao}
        />

        <MetricsCard
          titulo="Entregues"
          valor={metrics.entregues}
        />

        <MetricsCard
          titulo="Faturamento"
          valor={`R$ ${metrics.faturamento.toFixed(2)}`}
        />

        <MetricsCard
          titulo="Ticket Médio"
          valor={`R$ ${metrics.ticketMedio.toFixed(2)}`}
        />
      </section>

      {/* Área operacional */}
      <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Fluxo operacional */}
        <div className="min-h-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Fluxo da Operação
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Visão geral do andamento operacional.
              </p>
            </div>

            <span className="text-xl">
              🍔
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Novos
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-800">
                {Math.max(
                  metrics.pedidosHoje - metrics.entregues,
                  0
                )}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                aguardando
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Em preparo
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-800">
                {metrics.emProducao}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                produção
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Prontos
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-800">
                0
              </p>

              <p className="mt-1 text-xs text-slate-400">
                aguardando saída
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Entregues
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-800">
                {metrics.entregues}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                concluídos
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-orange-500 transition-all"
                style={{
                  width: `${
                    metrics.pedidosHoje > 0
                      ? Math.min(
                          (metrics.entregues /
                            metrics.pedidosHoje) *
                            100,
                          100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <span className="text-sm font-semibold text-slate-600">
              {metrics.pedidosHoje > 0
                ? Math.round(
                    (metrics.entregues /
                      metrics.pedidosHoje) *
                      100
                  )
                : 0}
              %
            </span>
          </div>
        </div>

        {/* Alertas */}
        <div className="min-h-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Atenção
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Pontos que merecem atenção.
              </p>
            </div>

            <span className="text-xl">
              🔔
            </span>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">
                🟡 Estado operacional
              </p>

              <p className="mt-1 text-xs text-amber-700">
                Acompanhe o horário de abertura e o estado
                atual da operação.
              </p>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm font-semibold text-blue-800">
                🔵 Produção
              </p>

              <p className="mt-1 text-xs text-blue-700">
                {metrics.emProducao} item(ns) atualmente
                em produção.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-700">
                ℹ️ Dados
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Os indicadores atuais ainda utilizam a
                camada de dados do Dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inteligência resumida */}
      <section className="shrink-0">
        <InsightCard mensagem={insight.mensagem} />
      </section>
    </div>
  );
}