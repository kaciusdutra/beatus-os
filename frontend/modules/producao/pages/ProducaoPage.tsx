"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { formatarCustoFino } from "@/modules/fichasTecnicas/pages/dadosFichas";

import type {
  LoteDeProducao,
  PrevisaoDeProducao,
} from "@/modules/estoque/types/estoque";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

interface Preparacao {
  id: string;
  nome: string;
  rendimento: number;
  unidadeRendimento: string;
  validadeDias?: number;
}

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export default function ProducaoPage() {
  const [preparacoes, setPreparacoes] = useState<Preparacao[]>([]);

  const [lotes, setLotes] = useState<LoteDeProducao[]>([]);

  const [fichaId, setFichaId] = useState("");

  const [planejada, setPlanejada] = useState("");

  const [produzida, setProduzida] = useState("");

  const [validade, setValidade] = useState("");

  const [observacao, setObservacao] = useState("");

  const [previsao, setPrevisao] = useState<PrevisaoDeProducao | null>(null);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [salvando, setSalvando] = useState(false);

  const carregarLotes = useCallback(async () => {
    const resposta = await fetch("/api/producao/lotes", { cache: "no-store" });

    const dados = await resposta.json();

    setLotes(dados.lotes ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [respostaFichas] = await Promise.all([
          fetch("/api/fichas", { cache: "no-store" }),
          carregarLotes(),
        ]);

        const dados = await respostaFichas.json();

        const lista: Preparacao[] = (dados.fichas ?? [])
          .filter(
            (ficha: {
              tipo: string;
              ativo: boolean;
              rendimento?: number;
              unidadeRendimento?: string;
            }) =>
              ficha.tipo === "PREPARACAO" &&
              ficha.ativo &&
              ficha.rendimento &&
              ficha.unidadeRendimento
          )
          .map(
            (ficha: {
              id: string;
              nome: string;
              rendimento: number;
              unidadeRendimento: string;
              validadeDias?: number;
            }) => ({
              id: ficha.id,
              nome: ficha.nome,
              rendimento: ficha.rendimento,
              unidadeRendimento: ficha.unidadeRendimento,
              validadeDias: ficha.validadeDias,
            })
          );

        setPreparacoes(lista);
      } catch {
        setErro("Não foi possível carregar as preparações.");
      }
    })();
  }, [carregarLotes]);

  const preparacao = preparacoes.find((item) => item.id === fichaId);

  function escolher(id: string) {
    setFichaId(id);

    const escolhida = preparacoes.find((item) => item.id === id);

    setPlanejada(escolhida ? String(escolhida.rendimento) : "");
    setProduzida("");
    setPrevisao(null);
    setAviso("");
    setErro("");
  }

  // Previsão do que a produção vai consumir, com o saldo antes e depois.
  useEffect(() => {
    const quantidade = Number(planejada.replace(",", "."));

    if (!fichaId || !(quantidade > 0)) {
      return;
    }

    let ativo = true;

    void (async () => {
      try {
        const resposta = await fetch(
          `/api/producao/previsao?fichaId=${encodeURIComponent(fichaId)}&quantidade=${quantidade}`,
          { cache: "no-store" }
        );

        const dados = await resposta.json();

        if (ativo) {
          setPrevisao(dados.sucesso ? dados.previsao : null);
        }
      } catch {
        if (ativo) {
          setPrevisao(null);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [fichaId, planejada]);

  async function registrar() {
    try {
      setSalvando(true);
      setErro("");
      setAviso("");

      const resposta = await fetch("/api/producao/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fichaId,
          quantidadePlanejada: Number(planejada.replace(",", ".")),
          quantidadeProduzida: Number(produzida.replace(",", ".")),
          validade,
          observacao,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível registrar o lote.");
      }

      const custo =
        dados.lote.custoUnitario !== undefined
          ? ` Custo: ${formatarCustoFino(dados.lote.custoUnitario)} por ${dados.lote.unidade}.`
          : "";

      setAviso(
        `Lote registrado: ${numero(dados.lote.quantidadeProduzida)} ${dados.lote.unidade} de ${dados.lote.nome}.${custo}${
          dados.avisos?.length ? ` Atenção: ${dados.avisos.join(" | ")}` : ""
        }`
      );

      setProduzida("");
      setObservacao("");

      await carregarLotes();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o lote."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Módulo</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Produção
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Produza um lote de uma preparação (blend, molhos, geleias). Os
            insumos usados saem do estoque e a preparação entra pelo que
            rendeu de verdade.
          </p>
        </div>

        <Link
          href="/estoque"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Estoque
        </Link>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {aviso && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {aviso}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Novo lote</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <label htmlFor="prep" className="mb-1 block text-xs font-semibold text-slate-600">
              Preparação
            </label>

            <select
              id="prep"
              value={fichaId}
              onChange={(evento) => escolher(evento.target.value)}
              className={CLASSE_CAMPO}
            >
              <option value="">Escolha...</option>

              {preparacoes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome} (receita rende {numero(item.rendimento)}{" "}
                  {item.unidadeRendimento})
                </option>
              ))}
            </select>

            {preparacoes.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Nenhuma preparação com rendimento. Cadastre em{" "}
                <Link href="/fichas" className="font-semibold text-sky-700 underline">
                  Fichas técnicas
                </Link>
                .
              </p>
            )}
          </div>

          {preparacao && (
            <>
              <div>
                <label htmlFor="plan" className="mb-1 block text-xs font-semibold text-slate-600">
                  Quanto vou fazer ({preparacao.unidadeRendimento})
                </label>

                <input
                  id="plan"
                  value={planejada}
                  onChange={(evento) => setPlanejada(evento.target.value)}
                  className={CLASSE_CAMPO}
                />
              </div>

              <div>
                <label htmlFor="prod" className="mb-1 block text-xs font-semibold text-slate-600">
                  Quanto rendeu de verdade ({preparacao.unidadeRendimento})
                </label>

                <input
                  id="prod"
                  value={produzida}
                  onChange={(evento) => setProduzida(evento.target.value)}
                  placeholder="Depois de pronto, pesado"
                  className={CLASSE_CAMPO}
                />
              </div>

              <div>
                <label htmlFor="val" className="mb-1 block text-xs font-semibold text-slate-600">
                  Validade
                  {preparacao.validadeDias
                    ? ` (vazio = ${preparacao.validadeDias} dia(s))`
                    : ""}
                </label>

                <input
                  id="val"
                  type="date"
                  value={validade}
                  onChange={(evento) => setValidade(evento.target.value)}
                  className={CLASSE_CAMPO}
                />
              </div>

              <div className="md:col-span-3">
                <label htmlFor="obs" className="mb-1 block text-xs font-semibold text-slate-600">
                  Observação
                </label>

                <input
                  id="obs"
                  value={observacao}
                  onChange={(evento) => setObservacao(evento.target.value)}
                  placeholder="Opcional"
                  className={CLASSE_CAMPO}
                />
              </div>
            </>
          )}
        </div>

        {preparacao && previsao && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-800">
              O que esta produção vai usar do estoque
            </h3>

            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm">
              {previsao.consumos.map((consumo) => (
                <li
                  key={`${consumo.itemTipo}:${consumo.id}`}
                  className="flex flex-wrap justify-between gap-2 px-4 py-2"
                >
                  <span>{consumo.nome}</span>

                  <span>
                    <strong>
                      {numero(consumo.quantidade)} {consumo.unidade}
                    </strong>{" "}
                    <span
                      className={
                        consumo.saldoDepois < 0
                          ? "font-semibold text-red-700"
                          : "text-slate-500"
                      }
                    >
                      (saldo {numero(consumo.saldoAtual)} →{" "}
                      {numero(consumo.saldoDepois)})
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {previsao.avisos.map((texto) => (
              <p key={texto} className="text-xs text-amber-700">
                {texto}
              </p>
            ))}
          </div>
        )}

        {preparacao && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={salvando}
              onClick={() => void registrar()}
              className="cursor-pointer rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando ? "Registrando..." : "Registrar lote"}
            </button>

            <Link
              href={`/fichas/${preparacao.id}/producao?quanto=${planejada.replace(",", ".")}`}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ficha de produção (como fazer)
            </Link>
          </div>
        )}
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Preparação</th>
              <th className="px-4 py-3 text-right">Planejado</th>
              <th className="px-4 py-3 text-right">Rendeu</th>
              <th className="px-4 py-3 text-right">Custo por unidade</th>
              <th className="px-4 py-3">Validade</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {lotes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Nenhum lote produzido ainda.
                </td>
              </tr>
            )}

            {lotes.map((lote) => (
              <tr key={lote.id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {new Date(lote.criadoEm).toLocaleString("pt-BR")}
                </td>

                <td className="px-4 py-3 font-medium text-slate-900">
                  {lote.nome}
                </td>

                <td className="px-4 py-3 text-right">
                  {numero(lote.quantidadePlanejada)} {lote.unidade}
                </td>

                <td className="px-4 py-3 text-right font-semibold">
                  {numero(lote.quantidadeProduzida)} {lote.unidade}
                </td>

                <td className="px-4 py-3 text-right">
                  {lote.custoUnitario !== undefined
                    ? formatarCustoFino(lote.custoUnitario)
                    : "—"}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {lote.validade
                    ? new Date(lote.validade).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
