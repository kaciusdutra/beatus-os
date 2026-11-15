"use client";

import Link from "next/link";

import PainelDoQr from "../components/PainelDoQr";

import { TIPOS_DE_QR, caminhoDoQr, interpretarQr, type TipoDeQr } from "../services/qr";

interface Props {
  tipo: string;
  id: string;
}

// A página que o QR da etiqueta abre (/q/insumo/<id> e /q/lote/<id>).
export default function FichaPorQrPage({ tipo, id }: Props) {
  const conteudo = TIPOS_DE_QR.includes(tipo as TipoDeQr) ? interpretarQr(caminhoDoQr(tipo as TipoDeQr, id)) : null;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <Link href="/celular" className="text-sm font-medium text-slate-500 hover:text-slate-700">
        ← Ler outro QR
      </Link>

      {conteudo ? (
        <PainelDoQr conteudo={conteudo} />
      ) : (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Este QR não é de uma etiqueta do Beatus.</p>
      )}
    </div>
  );
}
