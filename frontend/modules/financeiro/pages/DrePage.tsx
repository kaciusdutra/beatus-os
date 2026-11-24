"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import type { Dre } from "../types/dre";

const CLASSE_CAMPO = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function porcentagem(valor: number | null): string {
  return valor === null ? "—" : `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function mesDeHoje(): string {
  const agora = new Date();

  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function Linha({ rotulo, valor, destaque, negativo, ajuda }: { rotulo: string; valor: number; destaque?: boolean; negativo?: boolean; ajuda?: string }) {
  return (
    <tr className={destaque ? "bg-slate-50 font-bold text-slate-900" : "text-slate-700"}>
      <td className="px-4 py-3">
        {negativo ? "(−) " : ""}
        {rotulo}
        {ajuda && <span className="block text-xs font-normal text-slate-500">{ajuda}</span>}
      </td>

      <td className={`px-4 py-3 text-right ${destaque && valor < 0 ? "text-red-700" : ""}`}>{moeda(valor)}</td>
    </tr>
  );
}

// DRE do mês (regra 12.11): quanto sobrou da receita depois de comissões, taxas, impostos, custo dos produtos e custos fixos.
export default function DrePage() {
  const [mes, setMes] = useState(mesDeHoje);

  const [dre, setDre] = useState<Dre | null>(null);

  const [erro, setErro] = useState("");

  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const resposta = await fetch(`/api/financeiro/dre?mes=${mes}`, { cache: "no-store" });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível montar a DRE.");
    }

    setDre(dados.dre);
  }, [mes]);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível montar a DRE.");
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

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">DRE do mês</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Quanto sobrou da receita do mês depois de comissões, taxas, impostos, custo dos produtos e custos fixos. Conta pela data do pedido, por isso difere do Fluxo de caixa (que conta pela data do dinheiro).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input type="month" value={mes} onChange={(evento) => evento.target.value && setMes(evento.target.value)} className={CLASSE_CAMPO} aria-label="Mês" />

          <Link href="/financeiro" className="text-sm font-semibold text-slate-700 underline">
            Voltar ao Financeiro
          </Link>
        </div>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {carregando && <p className="text-sm text-slate-500">Montando a DRE...</p>}

      {dre && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Receita do mês</p>

              <p className="mt-1 text-2xl font-bold text-slate-900">{moeda(dre.receita.total)}</p>

              <p className="text-xs text-slate-500">
                {dre.pedidos} pedido(s){dre.cancelados > 0 ? `, ${dre.cancelados} cancelado(s) fora da conta` : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Lucro bruto</p>

              <p className="mt-1 text-2xl font-bold text-slate-900">{moeda(dre.lucroBruto)}</p>

              <p className="text-xs text-slate-500">margem bruta {porcentagem(dre.margemBruta)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Resultado do mês</p>

              <p className={`mt-1 text-2xl font-bold ${dre.resultado < 0 ? "text-red-700" : "text-emerald-700"}`}>{moeda(dre.resultado)}</p>

              <p className="text-xs text-slate-500">{porcentagem(dre.margemDoResultado)} da receita</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                <Linha rotulo="Produtos vendidos" valor={dre.receita.produtos} />

                <Linha rotulo="Descontos" valor={dre.receita.descontos} negativo ajuda="já abatidos do total do pedido" />

                <Linha rotulo="Taxa de entrega cobrada" valor={dre.receita.entrega} />

                <Linha rotulo="Receita total" valor={dre.receita.total} destaque />

                <Linha rotulo="Comissões dos marketplaces" valor={dre.deducoes.comissoes} negativo />

                <Linha rotulo="Taxas do Mercado Pago" valor={dre.deducoes.taxasDoGateway} negativo ajuda="a taxa real informada pelo gateway" />

                <Linha rotulo="Impostos (estimados)" valor={dre.deducoes.impostos} negativo ajuda="percentual da Precificação sobre a receita" />

                <Linha rotulo="Receita líquida" valor={dre.receitaLiquida} destaque />

                <Linha rotulo="Custo dos produtos vendidos" valor={dre.cmv.total} negativo ajuda="estimativa pela baixa do estoque" />

                <Linha rotulo="Lucro bruto" valor={dre.lucroBruto} destaque />

                <Linha rotulo="Custos fixos do mês" valor={dre.custosFixos} negativo ajuda="o mês inteiro, sem proporção de dias" />

                <Linha rotulo="Resultado do mês" valor={dre.resultado} destaque />
              </tbody>
            </table>
          </div>

          <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Leia antes de confiar nos números</p>

            {dre.avisos.map((aviso) => (
              <p key={aviso}>• {aviso}</p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
