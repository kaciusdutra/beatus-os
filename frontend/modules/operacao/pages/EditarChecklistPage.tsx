"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import {
  CHECKLIST_PADRAO,
  ROTULO_DO_TIPO,
  TIPOS_DE_CHECKLIST,
  type ItemDoModelo,
  type TipoDeChecklist,
} from "../services/checklist";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

interface Verificacao {
  chave: string;
  rotulo: string;
}

type Lista = Record<TipoDeChecklist, ItemDoModelo[]>;

export default function EditarChecklistPage() {
  const [tipo, setTipo] = useState<TipoDeChecklist>("ABERTURA");

  const [lista, setLista] = useState<Lista | null>(null);

  const [verificacoes, setVerificacoes] = useState<Verificacao[]>([]);

  const [erro, setErro] = useState("");

  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    const resposta = await fetch("/api/operacao/checklist/modelo", { cache: "no-store" });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível carregar a lista.");
    }

    setLista(dados.modelo);
    setVerificacoes(dados.verificacoes);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar a lista.");
      }
    })();
  }, [carregar]);

  function mudar(proxima: ItemDoModelo[]) {
    if (lista) {
      setLista({ ...lista, [tipo]: proxima });
      setMensagem("");
    }
  }

  function atualizar(indice: number, mudanca: Partial<ItemDoModelo>) {
    mudar((lista?.[tipo] ?? []).map((item, posicao) => (posicao === indice ? { ...item, ...mudanca } : item)));
  }

  function mover(indice: number, deslocamento: number) {
    const itens = [...(lista?.[tipo] ?? [])];

    const destino = indice + deslocamento;

    if (destino < 0 || destino >= itens.length) {
      return;
    }

    [itens[indice], itens[destino]] = [itens[destino], itens[indice]];

    mudar(itens);
  }

  async function salvar() {
    try {
      setErro("");
      setMensagem("");

      const resposta = await fetch("/api/operacao/checklist/modelo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, itens: lista?.[tipo] ?? [] }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível salvar a lista.");
      }

      setMensagem(`Lista de ${ROTULO_DO_TIPO[tipo].toLowerCase()} salva. Vale a partir do próximo checklist; o de hoje não muda.`);

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar a lista.");
    }
  }

  const itens = lista?.[tipo] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Operação</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Editar a lista do checklist</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            O checklist de cada dia é uma cópia desta lista: mudar aqui vale a partir do próximo checklist e não mexe no que já foi
            feito. Item com verificação automática se marca sozinho quando o sistema confirma (temperatura registrada, nenhum cartão
            vencido, estoque acima do mínimo).
          </p>
        </div>

        <Link href="/operacao" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          Voltar ao checklist
        </Link>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {mensagem && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensagem}</div>}

      <div className="flex flex-wrap gap-2">
        {TIPOS_DE_CHECKLIST.map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => {
              setTipo(opcao);
              setMensagem("");
            }}
            className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold ${
              tipo === opcao ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {ROTULO_DO_TIPO[opcao]}
          </button>
        ))}
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {itens.length === 0 && <p className="text-sm text-slate-400">Nenhum item. Adicione abaixo.</p>}

        {itens.map((item, indice) => (
          <div key={indice} className="space-y-2 rounded-xl border border-slate-200 p-3">
            <div className="grid gap-2 md:grid-cols-6">
              <input aria-label="Título do item" value={item.titulo} onChange={(evento) => atualizar(indice, { titulo: evento.target.value })} placeholder="O que precisa ser feito" className={`${CLASSE_CAMPO} md:col-span-3`} />

              <input aria-label="Categoria" value={item.categoria ?? ""} onChange={(evento) => atualizar(indice, { categoria: evento.target.value || undefined })} placeholder="Categoria (ex.: Higiene)" className={`${CLASSE_CAMPO} md:col-span-2`} />

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={item.obrigatorio} onChange={(evento) => atualizar(indice, { obrigatorio: evento.target.checked })} />
                Obrigatório
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select aria-label="Verificação automática" value={item.verificacao ?? ""} onChange={(evento) => atualizar(indice, { verificacao: evento.target.value || undefined })} className={`${CLASSE_CAMPO} max-w-md`}>
                <option value="">Manual (alguém marca)</option>

                {verificacoes.map((verificacao) => (
                  <option key={verificacao.chave} value={verificacao.chave}>
                    Automático: {verificacao.rotulo}
                  </option>
                ))}
              </select>

              <button type="button" onClick={() => mover(indice, -1)} disabled={indice === 0} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
                ↑
              </button>

              <button type="button" onClick={() => mover(indice, 1)} disabled={indice === itens.length - 1} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
                ↓
              </button>

              <button type="button" onClick={() => mudar(itens.filter((_, posicao) => posicao !== indice))} className="cursor-pointer text-xs font-semibold text-red-700 hover:text-red-900">
                Remover
              </button>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-3 pt-1">
          <button type="button" onClick={() => mudar([...itens, { titulo: "", obrigatorio: true }])} className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            + Adicionar item
          </button>

          <button type="button" onClick={() => mudar(CHECKLIST_PADRAO[tipo].map((item) => ({ ...item })))} className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Carregar a lista inicial
          </button>

          <button type="button" onClick={() => void salvar()} className="cursor-pointer rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800">
            Salvar a lista de {ROTULO_DO_TIPO[tipo].toLowerCase()}
          </button>
        </div>
      </section>
    </div>
  );
}
