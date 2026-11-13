"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

const CLASSE_CAMPO =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

const ENTIDADES = [
  ["", "Tudo"],
  ["PEDIDO", "Pedidos"],
  ["ENTRADA_COMPRA", "Compras"],
  ["ESTOQUE", "Estoque"],
  ["PRODUCAO", "Produção"],
  ["PRECO", "Preços"],
  ["FINANCEIRO", "Financeiro"],
] as const;

interface Atividade {
  id: string;
  entidade: string;
  acao: string;
  resumo: string;
  referenciaNumero?: string;
  operador?: string;
  criadoEm: string;
}

export default function AtividadesPage() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);

  const [entidade, setEntidade] = useState("");

  const [referencia, setReferencia] = useState("");

  const [de, setDe] = useState("");

  const [ate, setAte] = useState("");

  const [erro, setErro] = useState("");

  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const parametros = new URLSearchParams();

    if (entidade) parametros.set("entidade", entidade);
    if (referencia.trim()) parametros.set("referencia", referencia.trim());
    if (de) parametros.set("de", de);
    if (ate) parametros.set("ate", ate);

    const resposta = await fetch(`/api/atividades?${parametros}`, {
      cache: "no-store",
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível carregar.");
    }

    setAtividades(dados.atividades ?? []);
  }, [entidade, referencia, de, ate]);

  useEffect(() => {
    void (async () => {
      try {
        setErro("");

        await carregar();
      } catch (error) {
        setErro(
          error instanceof Error ? error.message : "Não foi possível carregar."
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/estoque"
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Estoque
        </Link>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Registro de atividades
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          O que aconteceu, quando e quem fez. O registro só recebe linhas
          novas: ninguém edita nem apaga.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="ent" className="mb-1 block text-xs font-semibold text-slate-600">
            Área
          </label>

          <select
            id="ent"
            value={entidade}
            onChange={(evento) => setEntidade(evento.target.value)}
            className={CLASSE_CAMPO}
          >
            {ENTIDADES.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ref" className="mb-1 block text-xs font-semibold text-slate-600">
            Número do pedido ou documento
          </label>

          <input
            id="ref"
            value={referencia}
            onChange={(evento) => setReferencia(evento.target.value)}
            className={CLASSE_CAMPO}
          />
        </div>

        <div>
          <label htmlFor="de" className="mb-1 block text-xs font-semibold text-slate-600">
            De
          </label>

          <input id="de" type="date" value={de} onChange={(evento) => setDe(evento.target.value)} className={CLASSE_CAMPO} />
        </div>

        <div>
          <label htmlFor="ate" className="mb-1 block text-xs font-semibold text-slate-600">
            Até
          </label>

          <input id="ate" type="date" value={ate} onChange={(evento) => setAte(evento.target.value)} className={CLASSE_CAMPO} />
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Quem</th>
              <th className="px-4 py-3">Área</th>
              <th className="px-4 py-3">O que aconteceu</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {!carregando && atividades.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Nenhuma atividade registrada para este filtro.
                </td>
              </tr>
            )}

            {atividades.map((atividade) => (
              <tr key={atividade.id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {new Date(atividade.criadoEm).toLocaleString("pt-BR")}
                </td>

                <td className="px-4 py-3 text-slate-700">
                  {atividade.operador ?? "—"}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {atividade.entidade} · {atividade.acao}
                </td>

                <td className="px-4 py-3 text-slate-900">{atividade.resumo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
