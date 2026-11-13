"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import type {
  AnaliseDeVendas,
  EtiquetaDoProduto,
} from "../types/analiseDeVendas";

const PERIODOS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];

const ETIQUETA: Record<EtiquetaDoProduto, { rotulo: string; cor: string }> = {
  MAIS_VENDIDO: { rotulo: "Mais vendido", cor: "bg-emerald-100 text-emerald-800" },
  REVER_MARGEM: { rotulo: "Rever margem", cor: "bg-red-100 text-red-800" },
  DIVULGAR: { rotulo: "Bom para divulgar", cor: "bg-sky-100 text-sky-800" },
};

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataCurta(texto: string): string {
  const [, mes, dia] = texto.split("-");

  return `${dia}/${mes}`;
}

export default function AnaliseDeVendasPage() {
  const [dias, setDias] = useState(30);

  const [analise, setAnalise] = useState<AnaliseDeVendas | null>(null);

  const [erro, setErro] = useState("");

  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const resposta = await fetch(`/api/dashboard/analise?dias=${dias}`, { cache: "no-store" });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível analisar as vendas.");
    }

    setAnalise(dados.analise);
  }, [dias]);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível analisar as vendas.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  const maiorCanal = Math.max(...(analise?.canais.map((canal) => canal.valor) ?? [0]), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Financeiro</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vendas por canal e produto</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            De onde vem a receita e o que mais rende, para decidir promoção e divulgação. Pedidos cancelados não
            entram. A margem é a registrada na Precificação para o preço praticado em cada canal.
          </p>
        </div>

        <div className="flex gap-2">
          {PERIODOS.map((periodo) => (
            <button
              key={periodo.dias}
              type="button"
              onClick={() => setDias(periodo.dias)}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold ${
                dias === periodo.dias ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {periodo.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {carregando && <p className="p-6 text-center text-sm text-slate-500">Carregando...</p>}

      {analise && (
        <>
          <p className="text-sm text-slate-600">
            {dataCurta(analise.de)} a {dataCurta(analise.ate)} · <strong>{analise.pedidos}</strong> pedido(s) ·{" "}
            <strong>{moeda(analise.faturamento)}</strong>
          </p>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">Receita por canal</h2>

            {analise.canais.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Sem vendas no período.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {analise.canais.map((canal) => (
                  <li key={canal.canal}>
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-semibold text-slate-700">
                        {canal.canal} <span className="font-normal text-slate-400">· {canal.pedidos} pedido(s) · ticket {moeda(canal.ticketMedio)}</span>
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
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-lg font-bold text-slate-800">Produtos</h2>

              <p className="text-xs text-slate-500">
                <strong>Mais vendido:</strong> os 3 que mais faturam. <strong>Rever margem:</strong> vende em um canal com margem abaixo
                da mínima ({analise.margemMinimaPercentual}%). <strong>Bom para divulgar:</strong> margem pelo menos{" "}
                {analise.folgaParaDivulgar} pontos acima da mínima e venda abaixo da mediana. Produto sem margem registrada só entra no
                ranking.
              </p>
            </div>

            {analise.produtos.length === 0 ? (
              <p className="p-5 text-sm text-slate-400">Sem vendas no período.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {analise.produtos.map((produto) => (
                  <li key={produto.produtoId} className="space-y-2 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{produto.nome}</p>

                        {produto.etiquetas.map((etiqueta) => (
                          <span key={etiqueta} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ETIQUETA[etiqueta].cor}`}>
                            {ETIQUETA[etiqueta].rotulo}
                          </span>
                        ))}
                      </div>

                      <p className="text-slate-700">
                        <strong>{produto.unidades}</strong> un. · <strong>{moeda(produto.valor)}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      {produto.porCanal.map((canal) => (
                        <span key={canal.canal} className="rounded-lg bg-slate-50 px-2.5 py-1">
                          {canal.canal}: {canal.unidades} un. · {moeda(canal.valor)}
                          {canal.margemPercentual !== undefined ? ` · margem ${canal.margemPercentual}%` : " · sem margem registrada"}
                        </span>
                      ))}
                    </div>

                    {produto.motivos.length > 0 && (
                      <ul className="space-y-0.5 text-xs text-slate-500">
                        {produto.motivos.map((motivo) => (
                          <li key={motivo}>• {motivo}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs text-slate-500">
            Para mudar preço ou margem, abra a <Link href="/financeiro/precificacao" className="font-semibold underline">Precificação</Link>.
            Para um combo ou promoção, use o simulador de promoção que fica lá.
          </p>
        </>
      )}
    </div>
  );
}
