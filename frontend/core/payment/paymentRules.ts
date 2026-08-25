import {
  ModalidadePagamento,
  StatusPagamento,
  Pedido,
} from "@/modules/pedidos/types/pedido";

export interface PaymentExceptionRules {
  permitirPagamentoNaEntrega: boolean;

  /**
   * Quando definido, pedidos acima desse
   * valor deverão utilizar pagamento antecipado.
   *
   * null = sem limite.
   */
  limiteValorNaEntrega: number | null;

  /**
   * Quando definido, pedidos acima dessa
   * distância deverão utilizar pagamento antecipado.
   *
   * null = sem limite adicional.
   */
  limiteDistanciaNaEntregaKm:
    | number
    | null;

  /**
   * Quando true, primeira compra deve
   * utilizar pagamento antecipado.
   *
   * Ainda não estamos conectando isso
   * ao cadastro de clientes.
   */
  primeiraCompraExigeAntecipado: boolean;
}

/**
 * Configuração inicial do Beatus.
 *
 * Os limites ficam preparados para serem
 * configurados posteriormente pelo sistema.
 */
export const paymentExceptionRules: PaymentExceptionRules = {
  permitirPagamentoNaEntrega:
    true,

  limiteValorNaEntrega:
    null,

  limiteDistanciaNaEntregaKm:
    null,

  primeiraCompraExigeAntecipado:
    false,
};

export function modalidadeExigePagamentoAntecipado(
  modalidade: ModalidadePagamento
): boolean {
  return modalidade === "ELETRONICO";
}

export function podeEntrarNaOperacao(
  pedido: Pedido
): boolean {
  if (
    pedido.pagamento.modalidade ===
    "NA_ENTREGA"
  ) {
    return (
      paymentExceptionRules
        .permitirPagamentoNaEntrega
    );
  }

  return (
    pedido.pagamento.status ===
    "APROVADO"
  );
}

export function podeUsarPagamentoNaEntrega(
  pedido: Pedido
): boolean {
  if (
    !paymentExceptionRules
      .permitirPagamentoNaEntrega
  ) {
    return false;
  }

  if (
    paymentExceptionRules
      .limiteValorNaEntrega !==
      null &&
    pedido.total >
      paymentExceptionRules
        .limiteValorNaEntrega
  ) {
    return false;
  }

  if (
    paymentExceptionRules
      .limiteDistanciaNaEntregaKm !==
      null &&
    pedido.distanciaEntregaKm !== null &&
    pedido.distanciaEntregaKm >
      paymentExceptionRules
        .limiteDistanciaNaEntregaKm
  ) {
    return false;
  }

  return true;
}

export function pagamentoFoiConfirmado(
  pedido: Pedido
): boolean {
  if (
    pedido.pagamento.modalidade ===
    "NA_ENTREGA"
  ) {
    return (
      pedido.pagamento.status ===
      "APROVADO"
    );
  }

  return (
    pedido.pagamento.status ===
    "APROVADO"
  );
}