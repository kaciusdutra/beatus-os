"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { textoDaData } from "../services/calcularCapitalDeGiro";

import type { CapitalDeGiro, ConfiguracaoFinanceira, FaixaDeTitulos } from "../types/contasAPagar";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

const COR_ALERTA = {
  CRITICO: "border-red-200 bg-red-50 text-red-800",
  ATENCAO: "border-amber-200 bg-amber-50 text-amber-800",
  INFO: "border-sky-200 bg-sky-50 text-sky-800",
} as const;

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataCurta(texto: string): string {
  const [, mes, dia] = texto.split("-");

  return `${dia}/${mes}`;
}

function Faixa({ titulo, faixa, destaque }: { titulo: string; faixa: FaixaDeTitulos; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${destaque && faixa.quantidade > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</p>

      <p className="mt-1 text-xl font-bold text-slate-900">{moeda(faixa.valor)}</p>

      <p className="text-xs text-slate-500">{faixa.quantidade} título(s)</p>
    </div>
  );
}

export default function CapitalDeGiroPage() {
  const [giro, setGiro] = useState<CapitalDeGiro | null>(null);

  const [configuracao, setConfiguracao] = useState<ConfiguracaoFinanceira | null>(null);

  const [erro, setErro] = useState("");

  const [editandoSaldo, setEditandoSaldo] = useState(false);

  const [saldo, setSaldo] = useState("");

  const [saldoEm, setSaldoEm] = useState(() => textoDaData(new Date()));

  const carregar = useCallback(async () => {
    const resposta = await fetch("/api/financeiro/capital-de-giro", { cache: "no-store" });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível carregar o capital de giro.");
    }

    setGiro(dados.giro);
    setConfiguracao(dados.configuracao);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar o capital de giro.");
      }
    })();
  }, [carregar]);

  async function salvarSaldo() {
    try {
      setErro("");

      const resposta = await fetch("/api/financeiro/configuracao", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldoInicial: saldo, saldoInicialEm: saldoEm }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível salvar o saldo inicial.");
      }

      setEditandoSaldo(false);

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o saldo inicial.");
    }
  }

  function abrirSaldo() {
    setSaldo(configuracao ? configuracao.saldoInicial.toFixed(2) : "");
    setSaldoEm(configuracao?.saldoInicialEm ?? textoDaData(new Date()));
    setEditandoSaldo(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Financeiro</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Capital de giro</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Quanto há em caixa, o que vence e como o caixa deve evoluir nos próximos 30 dias. A projeção é uma
            estimativa: vendas pela média dos últimos 28 dias, títulos pelo vencimento e custos fixos rateados por
            dia. Ela não inclui compras futuras à vista nem o repasse dos marketplaces.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/financeiro/contas-a-pagar" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Contas a pagar
          </Link>

          <button type="button" onClick={abrirSaldo} className="cursor-pointer rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Saldo inicial
          </button>
        </div>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {editandoSaldo && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Saldo inicial do caixa</h2>

          <p className="text-xs text-slate-500">
            Informe quanto você tem em caixa e no banco numa data. A partir dela, o sistema soma as entradas e subtrai as
            saídas do fluxo de caixa para saber o saldo de hoje.
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="saldo-inicial" className="mb-1 block text-xs font-semibold text-slate-600">Saldo (R$)</label>

              <input id="saldo-inicial" inputMode="decimal" value={saldo} onChange={(evento) => setSaldo(evento.target.value)} placeholder="0,00" className={CLASSE_CAMPO} />
            </div>

            <div>
              <label htmlFor="saldo-em" className="mb-1 block text-xs font-semibold text-slate-600">Vale a partir de</label>

              <input id="saldo-em" type="date" value={saldoEm} onChange={(evento) => setSaldoEm(evento.target.value)} className={CLASSE_CAMPO} />
            </div>

            <button type="button" onClick={() => void salvarSaldo()} className="cursor-pointer rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Salvar
            </button>

            <button type="button" onClick={() => setEditandoSaldo(false)} className="cursor-pointer text-sm font-semibold text-slate-600">
              Voltar
            </button>
          </div>
        </section>
      )}

      {giro && (
        <>
          {giro.alertas.length > 0 && (
            <section className="space-y-2">
              {giro.alertas.map((alerta) => (
                <div key={alerta.codigo} className={`rounded-xl border px-4 py-3 text-sm ${COR_ALERTA[alerta.nivel]}`}>
                  {alerta.mensagem}
                </div>
              ))}
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Saldo de hoje</p>

              <p className={`mt-1 text-xl font-bold ${giro.saldoAtual !== null && giro.saldoAtual < 0 ? "text-red-800" : "text-slate-900"}`}>
                {giro.saldoAtual === null ? "—" : moeda(giro.saldoAtual)}
              </p>

              <p className="text-xs text-slate-500">
                {giro.prazoMedioDias !== undefined ? `Prazo médio com fornecedores: ${giro.prazoMedioDias} dias` : "Ainda sem compras a prazo"}
              </p>
            </div>

            <Faixa titulo="Vencidos" faixa={giro.vencidos} destaque />

            <Faixa titulo="Vence hoje" faixa={giro.venceHoje} />

            <Faixa titulo="Total em aberto" faixa={giro.totalEmAberto} />
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <Faixa titulo="A pagar em até 7 dias" faixa={giro.ate7Dias} />

            <Faixa titulo="A pagar em até 15 dias" faixa={giro.ate15Dias} />

            <Faixa titulo="A pagar em até 30 dias" faixa={giro.ate30Dias} />
          </section>

          {giro.projecao.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-slate-700">
                Projeção do caixa (estimativa)
                {giro.menorSaldo ? ` · menor saldo: ${moeda(giro.menorSaldo.saldo)} em ${dataCurta(giro.menorSaldo.data)}` : ""}
              </h2>

              <div className="max-h-[28rem] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Dia</th>

                      <th className="px-4 py-2 text-right">Vendas esperadas</th>

                      <th className="px-4 py-2 text-right">Títulos a pagar</th>

                      <th className="px-4 py-2 text-right">Custos fixos</th>

                      <th className="px-4 py-2 text-right">Saldo</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {giro.projecao.map((dia) => (
                      <tr key={dia.data} className={dia.saldo < 0 ? "bg-red-50" : ""}>
                        <td className="px-4 py-2">{dataCurta(dia.data)}{dia.data === giro.hoje ? " (hoje)" : ""}</td>

                        <td className="px-4 py-2 text-right text-emerald-700">{dia.vendasEsperadas > 0 ? moeda(dia.vendasEsperadas) : "—"}</td>

                        <td className="px-4 py-2 text-right text-red-700">{dia.titulosAPagar > 0 ? moeda(dia.titulosAPagar) : "—"}</td>

                        <td className="px-4 py-2 text-right text-slate-500">{dia.custosFixos > 0 ? moeda(dia.custosFixos) : "—"}</td>

                        <td className={`px-4 py-2 text-right font-semibold ${dia.saldo < 0 ? "text-red-800" : "text-slate-900"}`}>{moeda(dia.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
