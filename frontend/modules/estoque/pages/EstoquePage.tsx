"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { formatarMoeda } from "@/modules/fichasTecnicas/pages/dadosFichas";

import {
  ROTULO_DO_MOVIMENTO,
  type MovimentoListado,
  type SaldoDeEstoque,
} from "../types/estoque";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

type Acao = "CONTAGEM" | "PERDA" | "MINIMO" | "HISTORICO";

export default function EstoquePage() {
  const [saldos, setSaldos] = useState<SaldoDeEstoque[]>([]);

  const [aba, setAba] = useState<"INSUMO" | "PREPARACAO">("INSUMO");

  const [busca, setBusca] = useState("");

  const [somenteAlertas, setSomenteAlertas] = useState(false);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [carregando, setCarregando] = useState(true);

  const [selecionado, setSelecionado] = useState<{
    item: SaldoDeEstoque;
    acao: Acao;
  } | null>(null);

  const [quantidade, setQuantidade] = useState("");

  const [motivo, setMotivo] = useState("");

  const [historico, setHistorico] = useState<MovimentoListado[]>([]);

  const carregar = useCallback(async () => {
    const resposta = await fetch("/api/estoque", { cache: "no-store" });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível carregar o estoque.");
    }

    setSaldos(dados.saldos ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o estoque."
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return saldos.filter(
      (item) =>
        item.itemTipo === aba &&
        (!termo || item.nome.toLowerCase().includes(termo)) &&
        (!somenteAlertas || item.abaixoDoMinimo || item.saldo < 0)
    );
  }, [saldos, aba, busca, somenteAlertas]);

  const alertas = saldos.filter(
    (item) => item.abaixoDoMinimo || item.saldo < 0
  ).length;

  const valorTotal = saldos.reduce((soma, item) => soma + (item.valor ?? 0), 0);

  async function abrir(item: SaldoDeEstoque, acao: Acao) {
    setSelecionado({ item, acao });
    setQuantidade(
      acao === "CONTAGEM"
        ? String(item.saldo).replace(".", ",")
        : acao === "MINIMO" && item.minimo !== undefined
          ? String(item.minimo).replace(".", ",")
          : ""
    );
    setMotivo("");
    setErro("");
    setAviso("");

    if (acao === "HISTORICO") {
      try {
        const resposta = await fetch(
          `/api/estoque/historico?itemTipo=${item.itemTipo}&id=${encodeURIComponent(item.id)}`,
          { cache: "no-store" }
        );

        const dados = await resposta.json();

        setHistorico(dados.movimentos ?? []);
      } catch {
        setHistorico([]);
      }
    }
  }

  async function enviar(url: string, metodo: string, corpo: unknown) {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível salvar.");
    }

    return dados;
  }

  async function confirmar() {
    if (!selecionado) {
      return;
    }

    const { item, acao } = selecionado;

    const valor = Number(quantidade.replace(",", "."));

    try {
      setErro("");
      setAviso("");

      if (acao === "CONTAGEM") {
        const resultado = await enviar("/api/estoque/contagem", "POST", {
          itemTipo: item.itemTipo,
          id: item.id,
          contado: valor,
          motivo,
        });

        setAviso(
          `Contagem salva: ajuste de ${numero(resultado.ajuste)} ${item.unidade}.`
        );
      } else if (acao === "PERDA") {
        await enviar("/api/estoque/perda", "POST", {
          itemTipo: item.itemTipo,
          id: item.id,
          quantidade: valor,
          motivo,
        });

        setAviso("Perda registrada.");
      } else if (acao === "MINIMO") {
        await enviar("/api/estoque/minimo", "PUT", {
          itemTipo: item.itemTipo,
          id: item.id,
          minimo: quantidade.trim() === "" ? null : valor,
        });

        setAviso("Estoque mínimo salvo.");
      }

      setSelecionado(null);

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível salvar."
      );
    }
  }

  if (carregando) {
    return (
      <p className="p-10 text-center text-sm text-slate-500">
        Carregando estoque...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Módulo</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Estoque
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            O saldo de cada insumo e de cada preparação. A compra confirmada
            entra sozinha; a produção usa os insumos e dá entrada na
            preparação; contagens e perdas ficam registradas.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/producao"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Produção
          </Link>

          <Link
            href="/atividades"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Registro de atividades
          </Link>
        </div>
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

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Itens controlados
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {saldos.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Alertas (abaixo do mínimo ou negativo)
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${alertas > 0 ? "text-amber-700" : "text-slate-900"}`}
          >
            {alertas}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Valor em estoque
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatarMoeda(valorTotal)}
          </p>
        </div>
      </section>

      {selecionado && (
        <section className="space-y-3 rounded-2xl border border-slate-300 bg-slate-50 p-5">
          <h2 className="text-lg font-bold text-slate-900">
            {selecionado.acao === "CONTAGEM"
              ? "Contagem"
              : selecionado.acao === "PERDA"
                ? "Registrar perda"
                : selecionado.acao === "MINIMO"
                  ? "Estoque mínimo"
                  : "Histórico"}
            : {selecionado.item.nome}
          </h2>

          {selecionado.acao === "HISTORICO" ? (
            <ul className="divide-y divide-slate-200 rounded-xl bg-white text-sm">
              {historico.length === 0 && (
                <li className="px-4 py-3 text-slate-500">
                  Nenhum movimento ainda.
                </li>
              )}

              {historico.map((movimento) => (
                <li
                  key={movimento.id}
                  className="flex flex-wrap justify-between gap-2 px-4 py-2"
                >
                  <span>
                    {new Date(movimento.criadoEm).toLocaleString("pt-BR")} ·{" "}
                    {ROTULO_DO_MOVIMENTO[movimento.tipo] ?? movimento.tipo}
                    {movimento.motivo ? ` · ${movimento.motivo}` : ""}
                  </span>

                  <span
                    className={`font-semibold ${movimento.quantidade < 0 ? "text-red-700" : "text-emerald-700"}`}
                  >
                    {movimento.quantidade > 0 ? "+" : ""}
                    {numero(movimento.quantidade)} {movimento.unidade}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label
                  htmlFor="qtd"
                  className="mb-1 block text-xs font-semibold text-slate-600"
                >
                  {selecionado.acao === "CONTAGEM"
                    ? `Quanto você contou (${selecionado.item.unidade})`
                    : selecionado.acao === "PERDA"
                      ? `Quantidade perdida (${selecionado.item.unidade})`
                      : `Mínimo (${selecionado.item.unidade}); vazio remove`}
                </label>

                <input
                  id="qtd"
                  value={quantidade}
                  onChange={(evento) => setQuantidade(evento.target.value)}
                  className={CLASSE_CAMPO}
                />
              </div>

              {selecionado.acao !== "MINIMO" && (
                <div className="md:col-span-2">
                  <label
                    htmlFor="motivo"
                    className="mb-1 block text-xs font-semibold text-slate-600"
                  >
                    Motivo
                  </label>

                  <input
                    id="motivo"
                    value={motivo}
                    onChange={(evento) => setMotivo(evento.target.value)}
                    placeholder={
                      selecionado.acao === "CONTAGEM"
                        ? "Ex.: inventário semanal"
                        : "Ex.: venceu, caiu no chão"
                    }
                    className={CLASSE_CAMPO}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {selecionado.acao !== "HISTORICO" && (
              <button
                type="button"
                onClick={() => void confirmar()}
                className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Salvar
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelecionado(null)}
              className="cursor-pointer rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              Fechar
            </button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {(["INSUMO", "PREPARACAO"] as const).map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => setAba(valor)}
            className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold ${
              aba === valor
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {valor === "INSUMO" ? "Insumos e embalagens" : "Preparações"}
          </button>
        ))}

        <input
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar..."
          className="w-56 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
        />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={somenteAlertas}
            onChange={(evento) => setSomenteAlertas(evento.target.checked)}
          />
          Só alertas
        </label>
      </div>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3 text-right">Mínimo</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {visiveis.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  Nada por aqui ainda. O saldo começa quando uma compra é
                  confirmada, um lote é produzido ou uma contagem é feita.
                </td>
              </tr>
            )}

            {visiveis.map((item) => (
              <tr key={`${item.itemTipo}:${item.id}`}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {item.nome}

                  {item.categoria && (
                    <p className="text-xs font-normal text-slate-500">
                      {item.categoria}
                    </p>
                  )}
                </td>

                <td
                  className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${item.saldo < 0 ? "text-red-700" : "text-slate-900"}`}
                >
                  {numero(item.saldo)} {item.unidade}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">
                  {item.minimo !== undefined
                    ? `${numero(item.minimo)} ${item.unidade}`
                    : "—"}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                  {item.valor !== undefined ? formatarMoeda(item.valor) : "—"}
                </td>

                <td className="px-4 py-3">
                  {item.saldo < 0 ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                      negativo
                    </span>
                  ) : item.abaixoDoMinimo ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      abaixo do mínimo
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      ok
                    </span>
                  )}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {(
                    [
                      ["CONTAGEM", "Contar"],
                      ["PERDA", "Perda"],
                      ["MINIMO", "Mínimo"],
                      ["HISTORICO", "Histórico"],
                    ] as const
                  ).map(([acao, rotulo]) => (
                    <button
                      key={acao}
                      type="button"
                      onClick={() => void abrir(item, acao)}
                      className="ml-3 cursor-pointer text-sm font-semibold text-sky-700 hover:text-sky-900"
                    >
                      {rotulo}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
