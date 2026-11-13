import Link from "next/link";

import GreetingCard from "@/modules/dashboard/components/GreetingCard";
import OperationOverviewCard from "@/modules/dashboard/components/OperationOverviewCard";
import MetricsCard from "@/modules/dashboard/components/MetricsCard";
import InsightCard from "@/modules/dashboard/components/InsightCard";
import AtualizarSozinho from "@/modules/dashboard/components/AtualizarSozinho";

import { getDashboardService } from "@/modules/dashboard/services/server/dashboardServiceFactory";
import { analisarDashboard } from "@/modules/dashboard/domain/dashboardEngine";

// Os números mudam a cada pedido: nunca guardar a página pronta.
export const dynamic = "force-dynamic";

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const COR_ALERTA = {
  CRITICO: "border-red-200 bg-red-50 text-red-800",
  ATENCAO: "border-amber-200 bg-amber-50 text-amber-800",
  INFO: "border-sky-200 bg-sky-50 text-sky-800",
} as const;

export default async function Home() {
  const dados = await getDashboardService().carregar();

  const insight = analisarDashboard({
    pedidosHoje: dados.pedidosHoje,
    emOperacao: dados.emOperacao,
    novosParados: dados.novosParados,
  });

  const fluxo = [
    { rotulo: "Novos", valor: dados.emOperacao.novos, nota: "na fila" },
    { rotulo: "Em preparo", valor: dados.emOperacao.emPreparo, nota: "na cozinha" },
    { rotulo: "Prontos", valor: dados.emOperacao.prontos, nota: "aguardando saída" },
    { rotulo: "Em rota", valor: dados.emOperacao.emRota, nota: "com o entregador" },
  ];

  const maiorCanal = Math.max(...dados.vendasPorCanal.map((canal) => canal.valor), 1);

  const maiorProduto = Math.max(...dados.rankingProdutos.map((produto) => produto.valor), 1);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <AtualizarSozinho segundos={30} />

      <section className="grid shrink-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <GreetingCard />

        <OperationOverviewCard />
      </section>

      <section className="grid shrink-0 grid-cols-2 gap-4 xl:grid-cols-5">
        <MetricsCard
          titulo="Pedidos hoje"
          valor={dados.pedidosHoje}
          subtitulo={dados.cancelados > 0 ? `${dados.cancelados} cancelado(s) fora da conta` : undefined}
          fonte="Pedidos criados hoje no banco, sem os cancelados. Detalhes em Pedidos."
        />

        <MetricsCard
          titulo="Faturamento"
          valor={moeda(dados.faturamento)}
          fonte="Soma do total dos pedidos de hoje, sem os cancelados (inclui a taxa de entrega)."
        />

        <MetricsCard
          titulo="Ticket médio do dia"
          valor={moeda(dados.ticketMedio)}
          fonte="Faturamento de hoje dividido pelo número de pedidos de hoje, sem os cancelados."
        />

        <MetricsCard
          titulo="Em operação"
          valor={dados.emOperacao.total}
          subtitulo="novos, em preparo, prontos e em rota"
          fonte="Pedidos de qualquer dia que ainda não foram entregues nem cancelados."
        />

        <MetricsCard
          titulo="Entregues hoje"
          valor={dados.entregues}
          fonte="Pedidos de hoje que já estão na situação Entregue."
        />
      </section>

      <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-h-0 space-y-4 overflow-hidden xl:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" title="Pedidos em andamento, de qualquer dia. Clique para operar na Cozinha.">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Fluxo da operação</h2>

              <Link href="/cozinha" className="text-sm font-semibold text-sky-700 underline">
                Abrir a Cozinha
              </Link>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {fluxo.map((etapa) => (
                <div key={etapa.rotulo} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm text-slate-500">{etapa.rotulo}</p>

                  <p className="mt-1 text-3xl font-bold text-slate-800">{etapa.valor}</p>

                  <p className="text-xs text-slate-400">{etapa.nota}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" title="Faturamento de hoje por canal de venda, sem os cancelados.">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Vendas por canal hoje</h2>

                <Link href="/financeiro/analise-de-vendas" className="text-xs font-semibold text-sky-700 underline">
                  Ver análise
                </Link>
              </div>

              {dados.vendasPorCanal.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Ainda sem vendas hoje.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {dados.vendasPorCanal.map((canal) => (
                    <li key={canal.canal}>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-700">
                          {canal.canal} <span className="font-normal text-slate-400">· {canal.pedidos} pedido(s)</span>
                        </span>

                        <span className="text-slate-700">
                          {moeda(canal.valor)} <span className="text-slate-400">({canal.percentual}%)</span>
                        </span>
                      </div>

                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.round((canal.valor / maiorCanal) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" title={`Produtos que mais faturaram nos últimos ${dados.diasDoRanking} dias, sem pedidos cancelados e sem adicionais.`}>
              <h2 className="text-lg font-bold text-slate-800">Mais vendidos ({dados.diasDoRanking} dias)</h2>

              {dados.rankingProdutos.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Ainda sem vendas no período.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {dados.rankingProdutos.map((produto, indice) => (
                    <li key={produto.nome}>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-700">
                          {indice + 1}. {produto.nome} <span className="font-normal text-slate-400">· {produto.quantidade} un.</span>
                        </span>

                        <span className="text-slate-700">{moeda(produto.valor)}</span>
                      </div>

                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-slate-700" style={{ width: `${Math.round((produto.valor / maiorProduto) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm" title="Avisos do financeiro (títulos e caixa) e do estoque (abaixo do mínimo).">
          <h2 className="text-lg font-bold text-slate-800">Atenção</h2>

          <div className="mt-3 space-y-2">
            {dados.alertas.length === 0 && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Nada pedindo atenção agora.
              </p>
            )}

            {dados.alertas.map((alerta, indice) => (
              <div key={indice} className={`rounded-lg border p-3 text-sm ${COR_ALERTA[alerta.nivel]}`}>
                <p>{alerta.mensagem}</p>

                {alerta.href && (
                  <Link href={alerta.href} className="mt-1 inline-block text-xs font-semibold underline">
                    Resolver
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shrink-0">
        <InsightCard mensagem={insight.mensagem} />
      </section>
    </div>
  );
}
