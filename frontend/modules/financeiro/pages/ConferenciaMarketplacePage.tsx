"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { textoDaData } from "../services/calcularCapitalDeGiro";

import type {
  ConferenciaDoMarketplace,
  PedidoDoMarketplace,
} from "../types/conferenciaMarketplace";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

const FILTROS = [
  { chave: "AGUARDANDO", rotulo: "Aguardando" },
  { chave: "CONFERIDO", rotulo: "Conferidos" },
  { chave: "TODOS", rotulo: "Todos" },
] as const;

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function dataCurta(texto: string): string {
  const [ano, mes, dia] = texto.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default function ConferenciaMarketplacePage() {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["chave"]>("AGUARDANDO");

  const [pedidos, setPedidos] = useState<PedidoDoMarketplace[]>([]);

  const [resumo, setResumo] = useState<ConferenciaDoMarketplace | null>(null);

  const [erro, setErro] = useState("");

  const [carregando, setCarregando] = useState(true);

  const [conferindo, setConferindo] = useState<PedidoDoMarketplace | null>(null);

  const [valor, setValor] = useState("");

  const [recebidoEm, setRecebidoEm] = useState(() => textoDaData(new Date()));

  const [observacao, setObservacao] = useState("");

  const carregar = useCallback(async () => {
    const resposta = await fetch(
      `/api/financeiro/conferencia-marketplace${filtro === "TODOS" ? "" : `?status=${filtro}`}`,
      { cache: "no-store" }
    );

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível carregar a conferência.");
    }

    setPedidos(dados.pedidos ?? []);
    setResumo(dados.resumo ?? null);
  }, [filtro]);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar a conferência.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  function abrirConferencia(pedido: PedidoDoMarketplace) {
    setConferindo(pedido);
    setValor(pedido.liquidoEsperado.toFixed(2));
    setRecebidoEm(textoDaData(new Date()));
    setObservacao("");
  }

  async function confirmar() {
    if (!conferindo) {
      return;
    }

    try {
      setErro("");

      const resposta = await fetch(`/api/financeiro/conferencia-marketplace/${conferindo.id}/conferir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valorRecebido: valor, recebidoEm, observacao }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível conferir o pedido.");
      }

      setConferindo(null);

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível conferir o pedido.");
    }
  }

  const diferencaDigitada = conferindo ? Math.round((Number(valor.replace(",", ".")) - conferindo.liquidoEsperado) * 100) / 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Financeiro</p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Conferência dos marketplaces</h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Pedidos do iFood, 99Food e Keeta ficam aguardando até você conferir o repasse. O valor esperado é o total
          do pedido menos a comissão do canal (Financeiro → Precificação). O dinheiro só entra no{" "}
          <Link href="/financeiro/fluxo-de-caixa" className="font-semibold underline">fluxo de caixa</Link> quando o repasse é
          conferido, no valor e na data em que você recebeu.
        </p>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {resumo && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Aguardando conferência</p>

            <p className="mt-1 text-xl font-bold text-amber-900">{moeda(resumo.aguardando.esperado)}</p>

            <p className="text-xs text-amber-800">{resumo.aguardando.quantidade} pedido(s) a receber</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Já conferido</p>

            <p className="mt-1 text-xl font-bold text-slate-900">{moeda(resumo.conferidos.recebido)}</p>

            <p className="text-xs text-slate-500">{resumo.conferidos.quantidade} pedido(s), esperado {moeda(resumo.conferidos.esperado)}</p>
          </div>

          <div className={`rounded-2xl border p-4 ${resumo.conferidos.diferenca < 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Diferença acumulada</p>

            <p className={`mt-1 text-xl font-bold ${resumo.conferidos.diferenca < 0 ? "text-red-800" : "text-slate-900"}`}>
              {moeda(resumo.conferidos.diferenca)}
            </p>

            <p className="text-xs text-slate-500">recebido menos esperado</p>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((item) => (
          <button
            key={item.chave}
            type="button"
            onClick={() => setFiltro(item.chave)}
            className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold ${
              filtro === item.chave ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {carregando && <p className="p-6 text-center text-sm text-slate-500">Carregando...</p>}

      {!carregando && pedidos.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Nenhum pedido nesta lista.</p>
      )}

      {pedidos.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm shadow-sm">
          {pedidos.map((pedido) => (
            <li key={pedido.id} className="space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {pedido.canal} · código {pedido.codigoExterno}{" "}
                    <span className="font-normal text-slate-500">· pedido #{pedido.numero}</span>
                  </p>

                  <p className="text-xs text-slate-500">
                    {dataHora(pedido.criadoEm)}
                    {pedido.nomeClienteExterno ? ` · ${pedido.nomeClienteExterno}` : ""} · total {moeda(pedido.total)} · comissão{" "}
                    {moeda(pedido.comissaoEsperada)}
                    {pedido.recebidoEm ? ` · recebido em ${dataCurta(pedido.recebidoEm)}` : ""}
                    {pedido.observacao ? ` · ${pedido.observacao}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{moeda(pedido.liquidoEsperado)}</p>

                    <p className="text-xs text-slate-500">esperado</p>
                  </div>

                  {pedido.cancelado && <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">Cancelado</span>}

                  {pedido.status === "CONFERIDO" && pedido.valorRecebido !== undefined && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${(pedido.diferenca ?? 0) < 0 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                      recebido {moeda(pedido.valorRecebido)}
                      {pedido.diferenca ? ` (${pedido.diferenca > 0 ? "+" : ""}${moeda(pedido.diferenca)})` : ""}
                    </span>
                  )}

                  {pedido.status === "AGUARDANDO" && !pedido.cancelado && (
                    <button type="button" onClick={() => abrirConferencia(pedido)} className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                      Conferir
                    </button>
                  )}
                </div>
              </div>

              {conferindo?.id === pedido.id && (
                <div className="flex flex-wrap items-end gap-3 rounded-xl bg-emerald-50 p-3">
                  <div>
                    <label htmlFor="valor-recebido" className="mb-1 block text-xs font-semibold text-slate-700">Valor recebido (R$)</label>

                    <input id="valor-recebido" inputMode="decimal" value={valor} onChange={(evento) => setValor(evento.target.value)} className={CLASSE_CAMPO} />
                  </div>

                  <div>
                    <label htmlFor="recebido-em" className="mb-1 block text-xs font-semibold text-slate-700">Recebido em</label>

                    <input id="recebido-em" type="date" value={recebidoEm} onChange={(evento) => setRecebidoEm(evento.target.value)} className={CLASSE_CAMPO} />
                  </div>

                  <div className="min-w-48 flex-1">
                    <label htmlFor="obs-conferencia" className="mb-1 block text-xs font-semibold text-slate-700">Observação (opcional)</label>

                    <input id="obs-conferencia" value={observacao} onChange={(evento) => setObservacao(evento.target.value)} className={CLASSE_CAMPO} />
                  </div>

                  <button type="button" onClick={() => void confirmar()} className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
                    Confirmar conferência
                  </button>

                  <button type="button" onClick={() => setConferindo(null)} className="cursor-pointer text-xs font-semibold text-slate-600">
                    Voltar
                  </button>

                  <p className={`w-full text-xs font-semibold ${diferencaDigitada < 0 ? "text-red-700" : "text-slate-500"}`}>
                    Diferença para o esperado: {moeda(Number.isFinite(diferencaDigitada) ? diferencaDigitada : 0)}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
