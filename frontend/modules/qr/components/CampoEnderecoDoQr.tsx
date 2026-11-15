"use client";

import { useState, useSyncExternalStore } from "react";

import { assinarEnderecoDoQr, guardarEnderecoDoQr, lerEnderecoDoQr } from "../services/enderecoDoQr";

// O endereço do sistema que vai dentro do QR. No servidor (e no primeiro desenho) é vazio.
export function useEnderecoDoQr(): string {
  return useSyncExternalStore(assinarEnderecoDoQr, lerEnderecoDoQr, () => "");
}

export default function CampoEnderecoDoQr() {
  const endereco = useEnderecoDoQr();

  const [digitado, setDigitado] = useState<string | null>(null);

  const emEdicao = digitado ?? endereco;

  return (
    <div>
      <label htmlFor="endereco-qr" className="mb-1 block text-xs font-semibold text-slate-600">
        Endereço do sistema dentro do QR
      </label>

      <div className="flex gap-2">
        <input
          id="endereco-qr"
          value={emEdicao}
          onChange={(evento) => setDigitado(evento.target.value)}
          className="w-72 max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <button
          type="button"
          onClick={() => {
            guardarEnderecoDoQr(emEdicao);
            setDigitado(null);
          }}
          className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
        >
          Usar
        </button>
      </div>

      <p className="mt-1 max-w-md text-xs text-slate-500">
        O leitor do Beatus abre a ficha certa mesmo se o endereço mudar. Já a câmera comum do celular só abre se o endereço for
        o do sistema hospedado (https).
      </p>
    </div>
  );
}
