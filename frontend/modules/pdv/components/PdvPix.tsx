"use client";

import { useState } from "react";

import QrImagem from "@/modules/qr/components/QrImagem";

export interface PixDoPdv {
  copiaECola: string;
  total: number;
  txid: string;
}

interface Props {
  // Pix gerado para o pedido atual (nulo se ainda não gerou ou se o pedido mudou)
  pix: PixDoPdv | null;

  gerando: boolean;

  erro: string;

  // Há itens e entrega calculada para gerar o Pix?
  podeGerar: boolean;

  recebido: boolean;

  // Total que a comanda mostra, para avisar se o servidor calculou outro valor.
  totalDaTela: number;

  onGerar: () => void;

  onRecebido: () => void;
}

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Cobrança por Pix no PDV: gera o copia e cola com o valor que o servidor
// calcula, para o cliente pagar pelo app do banco (por exemplo, enviado pelo
// WhatsApp). Quando o dinheiro cair, o operador marca "Pagamento recebido".
export default function PdvPix({ pix, gerando, erro, podeGerar, recebido, totalDaTela, onGerar, onRecebido }: Props) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (!pix) {
      return;
    }

    try {
      await navigator.clipboard.writeText(pix.copiaECola);

      setCopiado(true);

      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // o campo abaixo permite selecionar e copiar à mão
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Cobrança por Pix</p>

      {!pix && (
        <>
          <p className="text-xs text-sky-900">
            Gera o Pix copia e cola com o valor do pedido (calculado pelo servidor). Cole no WhatsApp do cliente.
          </p>

          <button
            type="button"
            disabled={!podeGerar || gerando}
            onClick={onGerar}
            className="w-full cursor-pointer rounded-xl bg-sky-700 px-4 py-3 text-sm font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {gerando ? "Gerando..." : "Gerar Pix"}
          </button>

          {!podeGerar && <p className="text-xs text-slate-500">Adicione os itens e calcule a entrega para gerar o Pix.</p>}
        </>
      )}

      {pix && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">Valor do Pix</span>

            <strong className="text-lg text-sky-900">{moeda(pix.total)}</strong>
          </div>

          {Math.abs(pix.total - totalDaTela) > 0.009 && (
            <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
              O servidor calculou {moeda(pix.total)}, diferente do total da tela ({moeda(totalDaTela)}). Vale o valor do servidor.
            </p>
          )}

          <div className="flex flex-col items-center gap-1 rounded-lg bg-white p-3">
            <QrImagem conteudo={pix.copiaECola} lado={240} className="h-44 w-44" />

            <p className="text-center text-xs text-slate-500">Ou mostre este QR: o cliente lê no app do banco.</p>
          </div>

          <textarea
            readOnly
            aria-label="Pix copia e cola"
            value={pix.copiaECola}
            rows={4}
            onFocus={(evento) => evento.currentTarget.select()}
            className="w-full resize-none rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs"
          />

          <div className="flex gap-2">
            <button type="button" onClick={() => void copiar()} className="flex-1 cursor-pointer rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800">
              {copiado ? "Copiado!" : "Copiar"}
            </button>

            <button type="button" onClick={onGerar} disabled={gerando} className="cursor-pointer rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100">
              Novo código
            </button>
          </div>

          <p className="text-xs text-slate-500">Código {pix.txid}. Se o pedido mudar, gere o Pix de novo.</p>

          <button
            type="button"
            disabled={recebido}
            onClick={onRecebido}
            className="w-full cursor-pointer rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {recebido ? "Pagamento recebido ✓" : "Pagamento recebido (conferi no banco)"}
          </button>
        </>
      )}

      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{erro}</p>}
    </div>
  );
}
