"use client";

import { useEffect, useState } from "react";

import QRCode from "qrcode";

interface Props {
  // O texto que o QR guarda (normalmente o link da ficha).
  conteudo: string;
  // Lado, em pixels, da imagem gerada. A tela e a impressão a redimensionam.
  lado?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Desenha o QR. Margem pequena e correção média: lê bem mesmo em etiqueta térmica pequena.
export default function QrImagem({ conteudo, lado = 240, className, style }: Props) {
  const [imagem, setImagem] = useState<{ conteudo: string; url: string } | null>(null);

  useEffect(() => {
    let cancelado = false;

    void QRCode.toDataURL(conteudo, { margin: 1, width: lado, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelado) {
          setImagem({ conteudo, url });
        }
      })
      .catch(() => {
        if (!cancelado) {
          setImagem(null);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [conteudo, lado]);

  // Enquanto gera (ou se o texto mudou), não mostra o QR de outro conteúdo.
  if (!imagem || imagem.conteudo !== conteudo) {
    return <div className={className} style={style} aria-hidden="true" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imagem.url} alt="QR code" className={className} style={style} />
  );
}
