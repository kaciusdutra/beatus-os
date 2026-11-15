"use client";

import { useCallback, useEffect, useState } from "react";

import { chamarApi } from "@/shared/api/chamarApi";

import type { ConteudoDoQr } from "../services/qr";

import type { ConferenciaDoItem } from "../types/qr";

import LeitorDeQr from "./LeitorDeQr";

import PainelDoQr from "./PainelDoQr";

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Conferir o estoque item a item: lê o QR e a ficha do item (saldo, validade,
// onde está, o que ficou anotado de ontem) abre na hora, ali mesmo, para
// conferir, contar ou anotar. Usado no checklist de abertura.
export default function ConferirPorQr() {
  const [lido, setLido] = useState<ConteudoDoQr | null>(null);

  const [conferidos, setConferidos] = useState<ConferenciaDoItem[]>([]);

  const carregar = useCallback(async () => {
    const dados = await chamarApi<{ conferidos: ConferenciaDoItem[] }>("/api/qr/conferencia", { falha: "Não foi possível ler as conferências." });

    setConferidos(dados.conferidos);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch {
        // sem a lista de conferidos a tela continua funcionando
      }
    })();
  }, [carregar]);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Conferir o estoque pelo QR</h2>

        <p className="text-sm text-slate-500">Leia a etiqueta do item para ver a ficha e conferir. Funciona melhor pelo celular.</p>
      </div>

      {lido ? (
        <div className="max-w-xl space-y-3">
          <PainelDoQr conteudo={lido} onMudou={() => void carregar().catch(() => undefined)} />

          <button type="button" onClick={() => setLido(null)} className="cursor-pointer rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
            Ler outro QR
          </button>
        </div>
      ) : (
        <LeitorDeQr onLido={setLido} />
      )}

      <div>
        <h3 className="text-sm font-bold text-slate-700">Conferido hoje ({conferidos.length})</h3>

        {conferidos.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum item conferido ainda.</p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-2">
            {conferidos.map((conferencia) => (
              <li key={conferencia.itemId} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                ✅ {conferencia.nome} · {hora(conferencia.em)}
                {conferencia.por ? ` · ${conferencia.por}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
