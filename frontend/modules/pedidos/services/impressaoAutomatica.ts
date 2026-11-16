// Impressão automática do ticket da cozinha: a tela /cozinha, com a opção ligada, imprime sozinha o
// ticket de cada pedido que entra. Só imprime ticket recente: o que ficou parado na fila de antes
// (tela fechada, pedido de teste) não sai de uma vez; esse sai pelo link "Ticket", com clique.

// Ticket de pedido com mais de 15 minutos não sai sozinho.
export const JANELA_DA_IMPRESSAO_MS = 15 * 60 * 1000;

export interface PedidoParaImprimir {
  id: string;
  statusOperacional: string;
  criadoEm: string;
  ticketStatus?: string;
}

// O próximo ticket a imprimir: pedido na fila ou em preparo, ticket ainda pendente, criado há pouco
// e ainda não tentado nesta tela. O mais antigo primeiro, para a ordem do papel seguir a da fila.
export function proximoTicketParaImprimir(
  pedidos: PedidoParaImprimir[],
  tentados: ReadonlySet<string>,
  agora: number
): string | undefined {
  const candidatos = pedidos
    .filter((pedido) => {
      if (pedido.statusOperacional !== "NOVO" && pedido.statusOperacional !== "EM_PREPARO") {
        return false;
      }

      if (pedido.ticketStatus === "IMPRESSO" || pedido.ticketStatus === "FALHOU") {
        return false;
      }

      if (tentados.has(pedido.id)) {
        return false;
      }

      const criado = new Date(pedido.criadoEm).getTime();

      return Number.isFinite(criado) && agora - criado <= JANELA_DA_IMPRESSAO_MS && criado <= agora + 60_000;
    })
    .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime());

  return candidatos[0]?.id;
}
