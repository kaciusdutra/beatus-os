import type {
  ConferenciaDoMarketplace,
  PedidoDoMarketplace,
} from "../types/conferenciaMarketplace";

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// Soma o que está aguardando e o que já foi conferido. Pedido cancelado não
// tem repasse e fica fora das duas contas.
export function resumirConferencia(
  pedidos: PedidoDoMarketplace[]
): ConferenciaDoMarketplace {
  const validos = pedidos.filter((pedido) => !pedido.cancelado);

  const aguardando = validos.filter((pedido) => pedido.status === "AGUARDANDO");

  const conferidos = validos.filter((pedido) => pedido.status === "CONFERIDO");

  return {
    aguardando: {
      quantidade: aguardando.length,
      esperado: arredondar(aguardando.reduce((soma, pedido) => soma + pedido.liquidoEsperado, 0)),
    },
    conferidos: {
      quantidade: conferidos.length,
      esperado: arredondar(conferidos.reduce((soma, pedido) => soma + pedido.liquidoEsperado, 0)),
      recebido: arredondar(conferidos.reduce((soma, pedido) => soma + (pedido.valorRecebido ?? 0), 0)),
      diferenca: arredondar(conferidos.reduce((soma, pedido) => soma + (pedido.diferenca ?? 0), 0)),
    },
  };
}
