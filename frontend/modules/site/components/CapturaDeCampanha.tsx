"use client";

import { useEffect } from "react";

import { guardarCampanhaDoEndereco } from "../services/campanhaGuardada";

// Não desenha nada: ao abrir qualquer página do site com utm_* no endereço (link de anúncio),
// guarda a campanha no navegador para ir junto com o pedido.
export default function CapturaDeCampanha() {
  useEffect(() => {
    try {
      guardarCampanhaDoEndereco(localStorage, new URLSearchParams(window.location.search), Date.now());
    } catch {
      // navegador sem armazenamento: o site funciona igual, só sem a medição da campanha
    }
  }, []);

  return null;
}
