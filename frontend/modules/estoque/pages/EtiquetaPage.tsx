"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import type { DadosDaEtiqueta } from "../types/estoque";

interface Props {
  parametros: {
    fichaTecnicaId?: string;
    producaoLoteId?: string;
    gavetaId?: string;
    local?: string;
  };
}

// Tamanhos de etiqueta comuns em rolo (largura x altura, em mm) e o corpo do texto.
const TAMANHOS = [
  { valor: "60x40", largura: 60, altura: 40, fonte: 8.5 },
  { valor: "100x50", largura: 100, altura: 50, fonte: 11 },
  { valor: "50x30", largura: 50, altura: 30, fonte: 7 },
] as const;

function dataHora(iso?: string): string {
  return iso
    ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "—";
}

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export default function EtiquetaPage({ parametros }: Props) {
  const [etiqueta, setEtiqueta] = useState<DadosDaEtiqueta | null>(null);

  const [erro, setErro] = useState("");

  const [tamanho, setTamanho] =
    useState<(typeof TAMANHOS)[number]["valor"]>("60x40");

  const [copias, setCopias] = useState("1");

  useEffect(() => {
    void (async () => {
      try {
        const consulta = new URLSearchParams();

        for (const [chave, valor] of Object.entries(parametros)) {
          if (valor) {
            consulta.set(chave, valor);
          }
        }

        const resposta = await fetch(`/api/estoque/etiqueta?${consulta}`, {
          cache: "no-store",
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
          throw new Error(dados.mensagem || "Não foi possível montar a etiqueta.");
        }

        setEtiqueta(dados.etiqueta);
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível montar a etiqueta."
        );
      }
    })();
  }, [parametros]);

  const medidas = TAMANHOS.find((item) => item.valor === tamanho) ?? TAMANHOS[0];

  const quantidadeDeCopias = Math.min(
    Math.max(Math.round(Number(copias) || 1), 1),
    100
  );

  async function imprimir() {
    if (!etiqueta) {
      return;
    }

    try {
      await fetch("/api/estoque/etiqueta/impressao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumo: `${etiqueta.titulo} ${etiqueta.nome} (${etiqueta.loteCodigo})`,
          copias: quantidadeDeCopias,
        }),
      });
    } catch {
      // o registro não impede a impressão
    }

    window.print();
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-etiquetas, #area-etiquetas * { visibility: visible; }
          #area-etiquetas { position: absolute; left: 0; top: 0; }
          @page { size: ${medidas.largura}mm ${medidas.altura}mm; margin: 0; }
        }
      `}</style>

      <div className="print:hidden">
        <Link
          href="/estoque/quadro"
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Quadro do estoque
        </Link>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Etiqueta
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Confira e imprima. Funciona em qualquer impressora; para uma térmica
          de rolo, escolha o tamanho do rolo e use o papel do mesmo tamanho nas
          configurações da impressora.
        </p>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">
          {erro}
        </div>
      )}

      {etiqueta && (
        <>
          <div className="flex flex-wrap items-end gap-4 print:hidden">
            <div>
              <label htmlFor="tam" className="mb-1 block text-xs font-semibold text-slate-600">
                Tamanho do rolo (mm)
              </label>

              <select
                id="tam"
                value={tamanho}
                onChange={(evento) => setTamanho(evento.target.value as typeof tamanho)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {TAMANHOS.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.largura} x {item.altura}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cop" className="mb-1 block text-xs font-semibold text-slate-600">
                Cópias
              </label>

              <input
                id="cop"
                value={copias}
                onChange={(evento) => setCopias(evento.target.value)}
                className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={() => void imprimir()}
              className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              🖨️ Imprimir
            </button>
          </div>

          <div id="area-etiquetas" className="space-y-4 print:space-y-0">
            {Array.from({ length: quantidadeDeCopias }, (_, indice) => (
              <div
                key={indice}
                className="box-border overflow-hidden border border-slate-900 bg-white text-black print:border-0"
                style={{
                  width: `${medidas.largura}mm`,
                  height: `${medidas.altura}mm`,
                  padding: "1.5mm",
                  fontSize: `${medidas.fonte}pt`,
                  lineHeight: 1.15,
                  pageBreakAfter: "always",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 800,
                    borderBottom: "0.4mm solid black",
                    paddingBottom: "0.5mm",
                    fontSize: `${medidas.fonte + 1.5}pt`,
                  }}
                >
                  <span>{etiqueta.titulo}</span>

                  <span>{etiqueta.loteCodigo}</span>
                </div>

                <div style={{ fontWeight: 700, fontSize: `${medidas.fonte + 2}pt`, marginTop: "0.5mm" }}>
                  {etiqueta.nome}
                </div>

                <div>
                  Preparo: {dataHora(etiqueta.preparadoEm)}
                  {etiqueta.gaveta ? ` · ${etiqueta.gaveta}` : ""}
                </div>

                {etiqueta.descongeladoEm && (
                  <div>Descongelado: {dataHora(etiqueta.descongeladoEm)}</div>
                )}

                <div style={{ fontWeight: 800, fontSize: `${medidas.fonte + 1}pt` }}>
                  VALIDADE: {dataHora(etiqueta.validadeAte)}
                </div>

                <div>
                  Conservar {etiqueta.temperatura} · {numero(etiqueta.quantidade)} {etiqueta.unidade}
                </div>

                <div>Resp.: {etiqueta.responsavel ?? "—"}</div>

                {etiqueta.avisos.map((aviso) => (
                  <div
                    key={aviso}
                    style={{
                      marginTop: "0.5mm",
                      border: "0.4mm solid black",
                      textAlign: "center",
                      fontWeight: 800,
                    }}
                  >
                    {aviso}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
