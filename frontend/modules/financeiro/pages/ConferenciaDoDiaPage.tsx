"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import type {
  ConferenciaDoDia,
  LinhaDoCanal,
  SituacaoDoCanal,
} from "../types/conferenciaDoDia";

const CLASSE_CAMPO =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

const SITUACAO: Record<SituacaoDoCanal, { rotulo: string; cor: string }> = {
  BATE: { rotulo: "Bate", cor: "bg-emerald-100 text-emerald-800" },
  CONFERIDO: { rotulo: "Conferido", cor: "bg-emerald-100 text-emerald-800" },
  AGUARDANDO: { rotulo: "Aguardando repasse", cor: "bg-amber-100 text-amber-800" },
  DIFERENCA: { rotulo: "Diferença", cor: "bg-red-100 text-red-800" },
};

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function texto(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const dia = String(data.getDate()).padStart(2, "0");

  return `${data.getFullYear()}-${mes}-${dia}`;
}

function deslocar(dataTexto: string, dias: number): string {
  const data = new Date(`${dataTexto}T12:00:00`);

  data.setDate(data.getDate() + dias);

  return texto(data);
}

function diaDaSemana(dataTexto: string): string {
  return new Date(`${dataTexto}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function Linha({ linha }: { linha: LinhaDoCanal }) {
  const marketplace = linha.tipo === "MARKETPLACE";

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-900">{linha.canal}</p>

        <p className="text-xs text-slate-500">
          {marketplace ? "marketplace" : "canal próprio"}
          {linha.cancelados > 0 ? ` · ${linha.cancelados} cancelado(s), ${moeda(linha.valorCancelado)} fora da conta` : ""}
        </p>
      </td>

      <td className="px-4 py-3 text-right">{linha.pedidos}</td>

      <td className="px-4 py-3 text-right font-semibold">{moeda(linha.vendido)}</td>

      <td className="px-4 py-3 text-right text-emerald-700">{moeda(linha.entrou)}</td>

      <td className="px-4 py-3 text-right text-amber-700">
        {marketplace ? moeda(linha.aReceber) : "—"}
        {marketplace && linha.pedidosAguardando > 0 && (
          <span className="block text-xs text-slate-500">{linha.pedidosAguardando} pedido(s)</span>
        )}
      </td>

      <td className="px-4 py-3 text-right text-slate-600">{marketplace ? moeda(linha.comissao) : "—"}</td>

      <td className={`px-4 py-3 text-right font-semibold ${Math.abs(linha.diferenca) < 0.01 ? "text-slate-500" : "text-red-700"}`}>
        {moeda(linha.diferenca)}
      </td>

      <td className="px-4 py-3 text-right">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SITUACAO[linha.situacao].cor}`}>{SITUACAO[linha.situacao].rotulo}</span>
      </td>
    </tr>
  );
}

export default function ConferenciaDoDiaPage() {
  const [dia, setDia] = useState(() => texto(new Date()));

  const [conferencia, setConferencia] = useState<ConferenciaDoDia | null>(null);

  const [erro, setErro] = useState("");

  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const resposta = await fetch(`/api/financeiro/conferencia-do-dia?data=${dia}`, { cache: "no-store" });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível conferir o dia.");
    }

    setConferencia(dados.conferencia);
  }, [dia]);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível conferir o dia.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Financeiro</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Conferência do dia</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Todos os pedidos do dia, de todos os canais, na mesma conta: o que foi vendido, o que já entrou, o que ainda falta
            chegar dos marketplaces e a diferença. Pedido de iFood e de WhatsApp ou site baixam o estoque do mesmo jeito; aqui eles
            só se separam pelo canal, porque o dinheiro chega de formas diferentes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDia(deslocar(dia, -1))} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            ←
          </button>

          <input type="date" aria-label="Dia" value={dia} onChange={(evento) => evento.target.value && setDia(evento.target.value)} className={CLASSE_CAMPO} />

          <button type="button" onClick={() => setDia(deslocar(dia, 1))} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            →
          </button>

          <button type="button" onClick={() => setDia(texto(new Date()))} className="cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Hoje
          </button>
        </div>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {carregando && <p className="p-6 text-center text-sm text-slate-500">Carregando...</p>}

      {conferencia && (
        <>
          <p className="text-sm font-semibold capitalize text-slate-700">{diaDaSemana(conferencia.data)}</p>

          {conferencia.canais.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Nenhum pedido neste dia.</p>
          ) : (
            <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Canal</th>

                    <th className="px-4 py-3 text-right">Pedidos</th>

                    <th className="px-4 py-3 text-right">Vendido</th>

                    <th className="px-4 py-3 text-right">Entrou</th>

                    <th className="px-4 py-3 text-right">A receber</th>

                    <th className="px-4 py-3 text-right">Comissão</th>

                    <th className="px-4 py-3 text-right">Diferença</th>

                    <th className="px-4 py-3 text-right">Situação</th>
                  </tr>
                </thead>

                <tbody>
                  {conferencia.canais.map((linha) => (
                    <Linha key={linha.canal} linha={linha} />
                  ))}
                </tbody>

                <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                  <tr>
                    <td className="px-4 py-3">Total do dia</td>

                    <td className="px-4 py-3 text-right">{conferencia.totais.pedidos}</td>

                    <td className="px-4 py-3 text-right">{moeda(conferencia.totais.vendido)}</td>

                    <td className="px-4 py-3 text-right text-emerald-700">{moeda(conferencia.totais.entrou)}</td>

                    <td className="px-4 py-3 text-right text-amber-700">{moeda(conferencia.totais.aReceber)}</td>

                    <td className="px-4 py-3 text-right">{moeda(conferencia.totais.comissoes)}</td>

                    <td className="px-4 py-3 text-right">{moeda(conferencia.totais.diferenca)}</td>

                    <td className="px-4 py-3 text-right text-xs font-semibold">{conferencia.fecha ? "✓ a conta fecha" : "⚠ não fecha"}</td>
                  </tr>
                </tfoot>
              </table>
            </section>
          )}

          <section className="space-y-1 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-800">Como ler</p>

            <p>
              <strong>Vendido</strong> = total dos pedidos do dia, sem os cancelados. <strong>Entrou</strong> = nos canais próprios, os
              pagamentos aprovados; nos marketplaces, os repasses que você já conferiu. <strong>A receber</strong> = o que a plataforma
              ainda deve (total menos comissão dos pedidos não conferidos). <strong>Diferença</strong> = entrou menos o esperado.
            </p>

            <p>
              A conta é: vendido = entrou + a receber + comissão − diferença. Os valores do iFood podem diferir dos de WhatsApp e do
              site (preço do canal e comissão), mas a cozinha é a mesma.
            </p>

            <p>
              Para conferir os repasses do iFood, use a{" "}
              <Link href="/financeiro/conferencia-marketplace" className="font-semibold underline">conferência dos marketplaces</Link>.
              O dinheiro só entra no{" "}
              <Link href="/financeiro/fluxo-de-caixa" className="font-semibold underline">fluxo de caixa</Link> quando o repasse é conferido.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
