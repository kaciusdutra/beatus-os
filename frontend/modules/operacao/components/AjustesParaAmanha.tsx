"use client";

import { useCallback, useEffect, useState } from "react";

import { chamarApi } from "@/shared/api/chamarApi";

import type { AjusteDoDia } from "../services/ajustes";

interface Props {
  // "ANOTAR" (fechamento): lista e deixa anotar. "VER" (abertura): só o que ficou do dia anterior.
  modo: "ANOTAR" | "VER";
}

function dataBr(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// O que se percebeu num dia de trabalho e facilita o seguinte. Anota-se no
// fechamento (ou na ficha de um item, pelo QR) e aparece na abertura seguinte
// até alguém marcar como resolvido.
export default function AjustesParaAmanha({ modo }: Props) {
  const [ajustes, setAjustes] = useState<AjusteDoDia[]>([]);

  const [texto, setTexto] = useState("");

  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    const dados = await chamarApi<{ ajustes: AjusteDoDia[] }>("/api/operacao/ajustes", { falha: "Não foi possível ler os ajustes." });

    setAjustes(dados.ajustes);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível ler os ajustes.");
      }
    })();
  }, [carregar]);

  async function anotar() {
    try {
      setErro("");

      await chamarApi("/api/operacao/ajustes", { corpo: { texto }, falha: "Não foi possível anotar o ajuste." });

      setTexto("");

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível anotar o ajuste.");
    }
  }

  async function resolver(id: string) {
    try {
      setErro("");

      await chamarApi(`/api/operacao/ajustes/${id}/resolver`, { corpo: {}, falha: "Não foi possível resolver." });

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível resolver.");
    }
  }

  if (modo === "VER" && ajustes.length === 0 && !erro) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <h2 className="text-lg font-bold text-amber-900">{modo === "ANOTAR" ? "Ajustes para amanhã" : "Do dia anterior"}</h2>

      {modo === "ANOTAR" && (
        <p className="text-sm text-amber-900">
          Anote o que facilita o próximo dia: repor, produzir mais, descongelar antes, item que acabou. Aparece na abertura de amanhã.
        </p>
      )}

      {erro && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</p>}

      {modo === "ANOTAR" && (
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Ajuste para amanhã"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Ex.: descer o cheddar do freezer na quinta de manhã"
            className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
          />

          <button type="button" onClick={() => void anotar()} disabled={!texto.trim()} className="cursor-pointer rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-40">
            Anotar
          </button>
        </div>
      )}

      {ajustes.length === 0 ? (
        <p className="text-sm text-amber-800">Nada anotado.</p>
      ) : (
        <ul className="space-y-2">
          {ajustes.map((ajuste) => (
            <li key={ajuste.id} className="flex items-start justify-between gap-3 text-sm text-amber-950">
              <span>
                {ajuste.itemNome ? <strong>{ajuste.itemNome}: </strong> : null}

                {ajuste.texto}

                <span className="block text-xs text-amber-700">
                  {dataBr(ajuste.criadoEm)}
                  {ajuste.criadoPor ? ` · ${ajuste.criadoPor}` : ""}
                </span>
              </span>

              <button type="button" onClick={() => void resolver(ajuste.id)} className="shrink-0 cursor-pointer text-xs font-bold underline">
                Resolvido
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
