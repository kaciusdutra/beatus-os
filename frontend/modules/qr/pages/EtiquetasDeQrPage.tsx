"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import type { SaldoDeEstoque } from "@/modules/estoque/types/estoque";

import CampoEnderecoDoQr, { useEnderecoDoQr } from "../components/CampoEnderecoDoQr";

import QrImagem from "../components/QrImagem";

import { chamarApi } from "@/shared/api/chamarApi";

import { linkDoQr } from "../services/qr";

// Tamanhos de etiqueta comuns em rolo (largura x altura, em mm), com o lado do QR.
const TAMANHOS = [
  { valor: "50x30", largura: 50, altura: 30, fonte: 8, qr: 24 },
  { valor: "60x40", largura: 60, altura: 40, fonte: 9, qr: 32 },
  { valor: "100x50", largura: 100, altura: 50, fonte: 12, qr: 42 },
] as const;

// QR para colar na gaveta, na prateleira ou na embalagem de cada insumo: ao ler,
// abre a ficha do item (saldo, contar, perda, anotar para amanhã).
export default function EtiquetasDeQrPage() {
  const [itens, setItens] = useState<SaldoDeEstoque[]>([]);

  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");

  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());

  const [tamanho, setTamanho] = useState<(typeof TAMANHOS)[number]["valor"]>("50x30");

  const endereco = useEnderecoDoQr();

  useEffect(() => {
    void chamarApi<{ saldos: SaldoDeEstoque[] }>("/api/estoque", { falha: "Não foi possível carregar os itens." })
      .then((dados) => setItens(dados.saldos.filter((item) => item.itemTipo === "INSUMO")))
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar os itens."));
  }, []);

  const filtrados = useMemo(
    () => itens.filter((item) => item.nome.toLowerCase().includes(busca.trim().toLowerCase())),
    [itens, busca]
  );

  const medidas = TAMANHOS.find((item) => item.valor === tamanho) ?? TAMANHOS[0];

  const aImprimir = itens.filter((item) => escolhidos.has(item.id));

  function alternar(id: string) {
    const proximo = new Set(escolhidos);

    if (proximo.has(id)) {
      proximo.delete(id);
    } else {
      proximo.add(id);
    }

    setEscolhidos(proximo);
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-qr, #area-qr * { visibility: visible; }
          #area-qr { position: absolute; left: 0; top: 0; }
          @page { size: ${medidas.largura}mm ${medidas.altura}mm; margin: 0; }
        }
      `}</style>

      <div className="print:hidden">
        <Link href="/estoque" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← Estoque
        </Link>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">QR dos insumos</h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Marque os insumos, escolha o tamanho do rolo e imprima uma etiqueta de QR para cada um. As etiquetas dos lotes (preparações)
          já levam o QR na própria etiqueta do quadro do estoque.
        </p>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">{erro}</div>}

      <div className="flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <label htmlFor="busca-qr" className="mb-1 block text-xs font-semibold text-slate-600">
            Buscar
          </label>

          <input id="busca-qr" value={busca} onChange={(evento) => setBusca(evento.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label htmlFor="tam-qr" className="mb-1 block text-xs font-semibold text-slate-600">
            Tamanho do rolo (mm)
          </label>

          <select id="tam-qr" value={tamanho} onChange={(evento) => setTamanho(evento.target.value as typeof tamanho)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {TAMANHOS.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.largura} x {item.altura}
              </option>
            ))}
          </select>
        </div>

        <CampoEnderecoDoQr />

        <button type="button" onClick={() => setEscolhidos(new Set(filtrados.map((item) => item.id)))} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
          Marcar os da lista
        </button>

        <button type="button" onClick={() => setEscolhidos(new Set())} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
          Limpar
        </button>

        <button
          type="button"
          disabled={aImprimir.length === 0}
          onClick={() => window.print()}
          className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          🖨️ Imprimir {aImprimir.length > 0 ? `(${aImprimir.length})` : ""}
        </button>
      </div>

      <ul className="grid gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-sm sm:grid-cols-2 lg:grid-cols-3 print:hidden">
        {filtrados.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
              <input type="checkbox" checked={escolhidos.has(item.id)} onChange={() => alternar(item.id)} />

              {item.nome}
            </label>
          </li>
        ))}

        {filtrados.length === 0 && <li className="px-2 py-1.5 text-slate-400">Nenhum insumo encontrado.</li>}
      </ul>

      <div id="area-qr" className="flex flex-wrap gap-3 print:block">
        {aImprimir.map((item) => (
          <div
            key={item.id}
            className="box-border flex items-center gap-[1.5mm] overflow-hidden border border-slate-900 bg-white text-black print:border-0"
            style={{ width: `${medidas.largura}mm`, height: `${medidas.altura}mm`, padding: "1.5mm", fontSize: `${medidas.fonte}pt`, lineHeight: 1.15, pageBreakAfter: "always" }}
          >
            {endereco && <QrImagem conteudo={linkDoQr(endereco, "insumo", item.id)} style={{ width: `${medidas.qr}mm`, height: `${medidas.qr}mm`, flexShrink: 0 }} />}

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800 }}>{item.nome}</div>

              <div>{item.unidade ? `em ${item.unidade}` : ""}</div>

              <div style={{ fontSize: `${medidas.fonte - 1.5}pt` }}>Beatus</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
