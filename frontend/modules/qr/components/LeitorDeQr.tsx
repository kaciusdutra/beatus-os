"use client";

import { useEffect, useRef, useState } from "react";

import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";

import { interpretarQr, type ConteudoDoQr } from "../services/qr";

interface Props {
  onLido: (conteudo: ConteudoDoQr) => void;
  // Texto do botão que abre a câmera.
  rotulo?: string;
}

// Lê o QR de uma etiqueta do Beatus pela câmera de trás do celular. A câmera
// só abre depois do toque no botão e só funciona em HTTPS (ou em localhost).
export default function LeitorDeQr({ onLido, rotulo = "📷 Ler QR code" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const aoLerRef = useRef(onLido);

  const [ativo, setAtivo] = useState(false);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [digitado, setDigitado] = useState("");

  useEffect(() => {
    aoLerRef.current = onLido;
  });

  useEffect(() => {
    if (!ativo) {
      return;
    }

    let cancelado = false;

    let controles: IScannerControls | undefined;

    void (async () => {
      try {
        const video = videoRef.current;

        if (!video) {
          return;
        }

        controles = await new BrowserQRCodeReader().decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          video,
          (resultado) => {
            if (!resultado || cancelado) {
              return;
            }

            const lido = interpretarQr(resultado.getText());

            if (!lido) {
              setAviso("Esse QR não é de uma etiqueta do Beatus. Aponte para a etiqueta do item.");

              return;
            }

            cancelado = true;

            controles?.stop();

            setAtivo(false);

            aoLerRef.current(lido);
          }
        );

        if (cancelado) {
          controles.stop();
        }
      } catch (error) {
        const negada = error instanceof DOMException && error.name === "NotAllowedError";

        setErro(
          negada
            ? "A câmera está bloqueada. Libere o acesso à câmera nas configurações do navegador e tente de novo."
            : "Não foi possível abrir a câmera neste aparelho."
        );

        setAtivo(false);
      }
    })();

    return () => {
      cancelado = true;

      controles?.stop();
    };
  }, [ativo]);

  function abrirCamera() {
    setErro("");
    setAviso("");

    // A câmera do navegador só existe em endereço seguro (HTTPS ou localhost).
    if (typeof window !== "undefined" && (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)) {
      setErro(
        "A câmera só abre quando o sistema é acessado por um endereço seguro (https://). Enquanto isso, cole o link do QR no campo abaixo."
      );

      return;
    }

    setAtivo(true);
  }

  function usarDigitado() {
    const lido = interpretarQr(digitado);

    if (!lido) {
      setErro("Esse link não é de uma etiqueta do Beatus.");

      return;
    }

    setErro("");
    setDigitado("");

    onLido(lido);
  }

  return (
    <div className="space-y-3">
      {ativo ? (
        <div className="space-y-2">
          <video ref={videoRef} muted playsInline className="aspect-square w-full max-w-sm rounded-2xl bg-black object-cover" />

          <p className="text-sm text-slate-600">Aponte a câmera para o QR da etiqueta.</p>

          {aviso && <p className="text-sm font-semibold text-amber-700">{aviso}</p>}

          <button type="button" onClick={() => setAtivo(false)} className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            Fechar a câmera
          </button>
        </div>
      ) : (
        <button type="button" onClick={abrirCamera} className="w-full cursor-pointer rounded-2xl bg-slate-900 px-6 py-4 text-lg font-bold text-white shadow-sm hover:bg-slate-800 sm:w-auto">
          {rotulo}
        </button>
      )}

      {erro && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      {!ativo && (
        <div className="flex max-w-md items-center gap-2">
          <input
            aria-label="Link do QR"
            value={digitado}
            onChange={(evento) => setDigitado(evento.target.value)}
            placeholder="Ou cole o link do QR aqui"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />

          <button type="button" onClick={usarDigitado} disabled={!digitado.trim()} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40">
            Abrir
          </button>
        </div>
      )}
    </div>
  );
}
