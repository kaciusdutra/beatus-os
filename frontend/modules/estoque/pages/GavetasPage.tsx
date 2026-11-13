"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import type {
  GavetaDoEstoque,
  RegraDeValidadeSalva,
} from "../types/estoque";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

interface Preparacao {
  id: string;
  nome: string;
}

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export default function GavetasPage() {
  const [gavetas, setGavetas] = useState<GavetaDoEstoque[]>([]);

  const [regras, setRegras] = useState<RegraDeValidadeSalva[]>([]);

  const [preparacoes, setPreparacoes] = useState<Preparacao[]>([]);

  const [freezer, setFreezer] = useState("");

  const [geladeira, setGeladeira] = useState("");

  const [nome, setNome] = useState("");

  const [preparacaoId, setPreparacaoId] = useState("");

  const [capacidade, setCapacidade] = useState("");

  const [diasEditados, setDiasEditados] = useState<Record<string, string>>({});

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    const [respostaGavetas, respostaRegras, respostaConfig, respostaFichas] =
      await Promise.all([
        fetch("/api/estoque/gavetas", { cache: "no-store" }),
        fetch("/api/estoque/regras", { cache: "no-store" }),
        fetch("/api/estoque/configuracao", { cache: "no-store" }),
        fetch("/api/fichas", { cache: "no-store" }),
      ]);

    const dadosGavetas = await respostaGavetas.json();
    const dadosRegras = await respostaRegras.json();
    const dadosConfig = await respostaConfig.json();
    const dadosFichas = await respostaFichas.json();

    setGavetas(dadosGavetas.gavetas ?? []);
    setRegras(dadosRegras.regras ?? []);

    setFreezer(
      dadosConfig.configuracao?.temperaturaFreezerC !== undefined
        ? String(dadosConfig.configuracao.temperaturaFreezerC).replace(".", ",")
        : ""
    );

    setGeladeira(
      dadosConfig.configuracao?.temperaturaGeladeiraC !== undefined
        ? String(dadosConfig.configuracao.temperaturaGeladeiraC).replace(".", ",")
        : ""
    );

    setPreparacoes(
      (dadosFichas.fichas ?? [])
        .filter((ficha: { tipo: string; ativo: boolean }) => ficha.tipo === "PREPARACAO" && ficha.ativo)
        .map((ficha: { id: string; nome: string }) => ({ id: ficha.id, nome: ficha.nome }))
    );

    setDiasEditados({});
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch {
        setErro("Não foi possível carregar a tela.");
      }
    })();
  }, [carregar]);

  async function enviar(url: string, metodo: string, corpo: unknown, sucesso: string) {
    try {
      setErro("");
      setAviso("");

      const resposta = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível salvar.");
      }

      setAviso(sucesso);

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  const numeroOuVazio = (texto: string) =>
    texto.trim() === "" ? null : Number(texto.replace(",", "."));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/estoque/quadro" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← Quadro do estoque
        </Link>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Gavetas, temperaturas e validade
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Nomeie as gavetas, informe as temperaturas reais e confira os prazos
          de validade. A validade do congelado depende da temperatura do
          freezer; sem medir, vale o prazo de 30 dias.
        </p>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {aviso && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{aviso}</div>}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Temperaturas</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="tf" className="mb-1 block text-xs font-semibold text-slate-600">Freezer (°C)</label>

            <input id="tf" value={freezer} onChange={(evento) => setFreezer(evento.target.value)} placeholder="Ex.: -20" className={CLASSE_CAMPO} />
          </div>

          <div>
            <label htmlFor="tg" className="mb-1 block text-xs font-semibold text-slate-600">Geladeira (°C)</label>

            <input id="tg" value={geladeira} onChange={(evento) => setGeladeira(evento.target.value)} placeholder="Ex.: 4" className={CLASSE_CAMPO} />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() =>
                void enviar(
                  "/api/estoque/configuracao",
                  "PUT",
                  { temperaturaFreezerC: numeroOuVazio(freezer), temperaturaGeladeiraC: numeroOuVazio(geladeira) },
                  "Temperaturas salvas."
                )
              }
              className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Salvar temperaturas
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Gavetas</h2>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label htmlFor="gn" className="mb-1 block text-xs font-semibold text-slate-600">Nome</label>

            <input id="gn" value={nome} onChange={(evento) => setNome(evento.target.value)} placeholder="Ex.: Blend Beatus" className={CLASSE_CAMPO} />
          </div>

          <div>
            <label htmlFor="gp" className="mb-1 block text-xs font-semibold text-slate-600">Guarda a preparação</label>

            <select id="gp" value={preparacaoId} onChange={(evento) => setPreparacaoId(evento.target.value)} className={CLASSE_CAMPO}>
              <option value="">Qualquer</option>

              {preparacoes.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="gc" className="mb-1 block text-xs font-semibold text-slate-600">Capacidade (opcional)</label>

            <input id="gc" value={capacidade} onChange={(evento) => setCapacidade(evento.target.value)} placeholder="Ainda não medida" className={CLASSE_CAMPO} />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() =>
                void enviar(
                  "/api/estoque/gavetas",
                  "POST",
                  { nome, fichaTecnicaId: preparacaoId, capacidade: numeroOuVazio(capacidade) },
                  "Gaveta criada."
                ).then(() => {
                  setNome("");
                  setCapacidade("");
                })
              }
              className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Criar gaveta
            </button>
          </div>
        </div>

        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm">
          {gavetas.length === 0 && <li className="px-4 py-3 text-slate-500">Nenhuma gaveta ainda.</li>}

          {gavetas.map((gaveta) => (
            <li key={gaveta.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span>
                <strong>{gaveta.nome}</strong>

                <span className="ml-2 text-slate-500">
                  {gaveta.preparacao ?? "qualquer preparação"} · dentro: {numero(gaveta.conteudo)} {gaveta.unidade ?? ""}
                  {gaveta.capacidade !== undefined ? ` de ${numero(gaveta.capacidade)}` : ""}
                  {!gaveta.ativo ? " · inativa" : ""}
                </span>
              </span>

              <button
                type="button"
                onClick={() => void enviar("/api/estoque/gavetas", "PATCH", { id: gaveta.id, ativo: !gaveta.ativo }, gaveta.ativo ? "Gaveta inativada." : "Gaveta reativada.")}
                className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                {gaveta.ativo ? "Inativar" : "Reativar"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Prazos de validade</h2>

        <p className="text-xs text-slate-500">
          Ponto de partida: {regras[0]?.fonte ?? "Portaria CVS 3/2026, art. 44"}. Os
          números são editáveis; confira sempre no texto oficial.
        </p>

        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm">
          {regras.map((regra) => (
            <li key={regra.categoria} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
              <span>
                {regra.descricao} <span className="text-slate-400">({regra.temperatura})</span>
              </span>

              <span className="flex items-center gap-2">
                <input
                  aria-label={`Dias de ${regra.descricao}`}
                  value={diasEditados[regra.categoria] ?? String(regra.dias)}
                  onChange={(evento) => setDiasEditados({ ...diasEditados, [regra.categoria]: evento.target.value })}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right"
                />

                <span className="text-slate-500">dias</span>

                {diasEditados[regra.categoria] !== undefined && diasEditados[regra.categoria] !== String(regra.dias) && (
                  <button
                    type="button"
                    onClick={() => void enviar("/api/estoque/regras", "PUT", { categoria: regra.categoria, dias: Number(diasEditados[regra.categoria]) }, "Prazo salvo.")}
                    className="cursor-pointer text-sm font-semibold text-sky-700"
                  >
                    Salvar
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
