import {
  Pedido,
  StatusOperacional,
} from "../types/pedido";

const transicoesPermitidas: Record<
  StatusOperacional,
  StatusOperacional[]
> = {
  NOVO: [
    "EM_PREPARO",
    "CANCELADO",
  ],

  EM_PREPARO: [
    "PRONTO",
    "CANCELADO",
  ],

  PRONTO: [
    "EM_ROTA",
    "CANCELADO",
  ],

  EM_ROTA: [
    "ENTREGUE",
    "CANCELADO",
  ],

  ENTREGUE: [],

  CANCELADO: [],
};

export function podeMudarStatus(
  atual: StatusOperacional,
  novo: StatusOperacional
): boolean {
  return transicoesPermitidas[
    atual
  ].includes(novo);
}

export function mudarStatusPedido(
  pedido: Pedido,
  novoStatus: StatusOperacional
): Pedido {
  if (
    !podeMudarStatus(
      pedido.statusOperacional,
      novoStatus
    )
  ) {
    throw new Error(
      `Transição inválida: ${pedido.statusOperacional} → ${novoStatus}`
    );
  }

  return {
    ...pedido,
    statusOperacional: novoStatus,
    atualizadoEm:
      new Date().toISOString(),
  };
}