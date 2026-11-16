"use client";

import { useEffect } from "react";

// Enquanto a Cozinha está aberta, o Beatus entrega os avisos pendentes do pedido (WhatsApp) a cada
// 15 segundos. Sem a conexão com a Meta configurada o servidor não envia nada. Um agendador no
// servidor, para quando ninguém tem a tela aberta, fica no BACKLOG.
export default function EnvioAutomaticoDeAvisos({ segundos = 15 }: { segundos?: number }) {
  useEffect(() => {
    async function enviar() {
      try {
        await fetch("/api/pedidos/avisos/enviar", { method: "POST" });
      } catch {
        // sem rede: tenta de novo no próximo ciclo
      }
    }

    void enviar();

    const intervalo = setInterval(() => void enviar(), segundos * 1000);

    return () => clearInterval(intervalo);
  }, [segundos]);

  return null;
}
