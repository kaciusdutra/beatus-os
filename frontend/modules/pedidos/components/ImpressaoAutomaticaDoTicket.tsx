"use client";

import { useEffect, useRef, useState } from "react";

import { proximoTicketParaImprimir, type PedidoParaImprimir } from "../services/impressaoAutomatica";

// Se o ticket não responder neste prazo, a tela segue para o próximo (o link "Ticket" continua valendo).
const PRAZO_POR_TICKET_MS = 20_000;

// Depois de mandar imprimir, espera um pouco antes de fechar o quadro, para o papel não ser cortado.
const FOLGA_DEPOIS_DE_IMPRIMIR_MS = 3_000;

// Não desenha nada: com a opção ligada, abre o ticket de cada pedido novo num quadro escondido, que
// marca IMPRESSO e manda imprimir. Sem clique só quando o Chrome da cozinha abre com a impressão
// silenciosa (--kiosk-printing); sem isso, o navegador mostra a janela de impressão.
export default function ImpressaoAutomaticaDoTicket({ pedidos, ligada }: { pedidos: PedidoParaImprimir[]; ligada: boolean }) {
  const [atual, setAtual] = useState<string | null>(null);

  const tentados = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!ligada || atual !== null) {
      return;
    }

    void (async () => {
      const proximo = proximoTicketParaImprimir(pedidos, tentados.current, Date.now());

      if (proximo) {
        tentados.current.add(proximo);

        setAtual(proximo);
      }
    })();
  }, [ligada, pedidos, atual]);

  useEffect(() => {
    if (atual === null) {
      return;
    }

    let seguir: ReturnType<typeof setTimeout> | undefined;

    const prazo = setTimeout(() => setAtual(null), PRAZO_POR_TICKET_MS);

    function aoReceber(evento: MessageEvent) {
      if (evento.origin !== window.location.origin || evento.data?.tipo !== "beatus-ticket-impresso" || evento.data?.id !== atual) {
        return;
      }

      clearTimeout(prazo);

      seguir = setTimeout(() => setAtual(null), FOLGA_DEPOIS_DE_IMPRIMIR_MS);
    }

    window.addEventListener("message", aoReceber);

    return () => {
      clearTimeout(prazo);
      clearTimeout(seguir);
      window.removeEventListener("message", aoReceber);
    };
  }, [atual]);

  if (!ligada || atual === null) {
    return null;
  }

  return (
    <iframe
      key={atual}
      title="Impressão automática do ticket"
      src={`/cozinha/ticket/${atual}?auto=1`}
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none fixed -left-[9999px] top-0 h-[600px] w-[400px] border-0 opacity-0 print:hidden"
    />
  );
}
