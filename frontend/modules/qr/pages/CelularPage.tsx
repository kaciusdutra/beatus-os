"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { useSystem } from "@/core/system/SystemContext";

import type { AjusteDoDia } from "@/modules/operacao/services/ajustes";

import LeitorDeQr from "../components/LeitorDeQr";

import PainelDoQr from "../components/PainelDoQr";

import { chamarApi, numeroDoCampo } from "@/shared/api/chamarApi";

import type { ConteudoDoQr } from "../services/qr";

import type { ConferenciaDoItem } from "../types/qr";

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-slate-500";

const TEXTO_DO_ESTADO: Record<string, string> = {
  FECHADA: "Hoje não há venda.",
  AGUARDANDO_ABERTURA: "Aguardando a hora de abrir.",
  CHECKLIST: "Hora de abrir: falta o checklist de abertura.",
  OPERANDO: "Operando.",
  FECHAMENTO: "Hora de fechar a cozinha.",
};

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// O Beatus no celular: ler o QR, abrir o checklist, anotar a temperatura e ver
// o que ficou para hoje. As telas são as mesmas do computador, em tamanho de mão.
export default function CelularPage() {
  const { systemState } = useSystem();

  const [lido, setLido] = useState<ConteudoDoQr | null>(null);

  const [ajustes, setAjustes] = useState<AjusteDoDia[]>([]);

  const [conferidos, setConferidos] = useState<ConferenciaDoItem[]>([]);

  const [freezer, setFreezer] = useState("");

  const [geladeira, setGeladeira] = useState("");

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    const [dadosAjustes, dadosConferidos] = await Promise.all([
      chamarApi<{ ajustes: AjusteDoDia[] }>("/api/operacao/ajustes", { falha: "Não foi possível ler os ajustes." }),
      chamarApi<{ conferidos: ConferenciaDoItem[] }>("/api/qr/conferencia", { falha: "Não foi possível ler as conferências." }),
    ]);

    setAjustes(dadosAjustes.ajustes);
    setConferidos(dadosConferidos.conferidos);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar.");
      }
    })();
  }, [carregar]);

  async function salvarTemperaturas() {
    try {
      setErro("");
      setAviso("");

      await chamarApi("/api/estoque/configuracao", {
        metodo: "PUT",
        corpo: {
          temperaturaFreezerC: freezer.trim() ? numeroDoCampo(freezer) : null,
          temperaturaGeladeiraC: geladeira.trim() ? numeroDoCampo(geladeira) : null,
        },
        falha: "Não foi possível salvar as temperaturas.",
      });

      setAviso("Temperaturas registradas.");
      setFreezer("");
      setGeladeira("");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar as temperaturas.");
    }
  }

  async function resolver(id: string) {
    try {
      await chamarApi(`/api/operacao/ajustes/${id}/resolver`, { corpo: {}, falha: "Não foi possível resolver." });

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível resolver.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Beatus no celular</h1>

        <p className="text-sm font-semibold text-slate-600">{TEXTO_DO_ESTADO[systemState.operation] ?? ""}</p>
      </div>

      {erro && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      {aviso && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{aviso}</p>}

      <Link href="/operacao" className="block rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg font-bold text-slate-900 shadow-sm">
        📋 Checklist de hoje
      </Link>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Ler o QR de uma etiqueta</h2>

        {lido ? (
          <div className="space-y-3">
            <PainelDoQr conteudo={lido} onMudou={() => void carregar()} />

            <button type="button" onClick={() => setLido(null)} className="w-full cursor-pointer rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
              Ler outro QR
            </button>
          </div>
        ) : (
          <LeitorDeQr onLido={setLido} />
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">🌡 Temperatura agora</h2>

        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Freezer (°C)" inputMode="decimal" value={freezer} onChange={(evento) => setFreezer(evento.target.value)} placeholder="Freezer °C" className={CLASSE_CAMPO} />

          <input aria-label="Geladeira (°C)" inputMode="decimal" value={geladeira} onChange={(evento) => setGeladeira(evento.target.value)} placeholder="Geladeira °C" className={CLASSE_CAMPO} />
        </div>

        <button type="button" onClick={() => void salvarTemperaturas()} disabled={!freezer.trim() && !geladeira.trim()} className="w-full cursor-pointer rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">
          Registrar temperatura
        </button>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">📝 Ajustes para amanhã</h2>

        {ajustes.length === 0 && <p className="text-sm text-slate-500">Nada anotado.</p>}

        <ul className="space-y-2">
          {ajustes.map((ajuste) => (
            <li key={ajuste.id} className="flex items-start justify-between gap-3 text-sm text-slate-800">
              <span>
                {ajuste.itemNome ? <strong>{ajuste.itemNome}: </strong> : null}

                {ajuste.texto}

                <span className="block text-xs text-slate-400">
                  {new Date(ajuste.criadoEm).toLocaleDateString("pt-BR")}
                  {ajuste.criadoPor ? ` · ${ajuste.criadoPor}` : ""}
                </span>
              </span>

              <button type="button" onClick={() => void resolver(ajuste.id)} className="cursor-pointer text-xs font-bold text-slate-700 underline">
                Resolvido
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">✅ Conferido hoje</h2>

        {conferidos.length === 0 && <p className="text-sm text-slate-500">Nenhum item conferido pelo QR ainda.</p>}

        <ul className="space-y-1 text-sm text-slate-700">
          {conferidos.map((conferencia) => (
            <li key={conferencia.itemId}>
              {conferencia.nome}{" "}
              <span className="text-xs text-slate-400">
                · {hora(conferencia.em)}
                {conferencia.por ? ` · ${conferencia.por}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
