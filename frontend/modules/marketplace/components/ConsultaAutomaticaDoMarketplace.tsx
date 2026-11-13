"use client";

import { useEffect } from "react";

// Enquanto a Cozinha está aberta, o Beatus consulta as plataformas ligadas
// (iFood, etc.) a cada 30 segundos. Plataforma desligada ou em simulação não faz
// nada no servidor. Um agendador no servidor para quando ninguém tem a tela
// aberta fica no BACKLOG (G10).
export default function ConsultaAutomaticaDoMarketplace({ segundos = 30 }: { segundos?: number }) {
  useEffect(() => {
    async function consultar() {
      try {
        await fetch("/api/integracoes/marketplace/consultar", { method: "POST" });
      } catch {
        // sem rede: tenta de novo no próximo ciclo
      }
    }

    void consultar();

    const intervalo = setInterval(() => void consultar(), segundos * 1000);

    return () => clearInterval(intervalo);
  }, [segundos]);

  return null;
}
