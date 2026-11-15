// Do que o gateway (Mercado Pago) diz para o que o Beatus entende.

export type StatusDoCheckout = "PENDENTE" | "PROCESSANDO" | "APROVADO" | "RECUSADO" | "EXPIRADO" | "CANCELADO" | "ERRO";

export type SituacaoDoPagamento = "APROVADO" | "PENDENTE" | "RECUSADO" | "CANCELADO" | "ESTORNADO";

export type MetodoDoPagamento = "PIX" | "CREDITO" | "DEBITO" | "OUTRO";

export function situacaoDoPagamentoMercadoPago(status: string | undefined): SituacaoDoPagamento {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
      return "APROVADO";

    case "rejected":
      return "RECUSADO";

    case "cancelled":
    case "canceled":
      return "CANCELADO";

    case "refunded":
    case "charged_back":
      return "ESTORNADO";

    // pending, in_process, in_mediation, authorized e o que vier de novo: ainda não é dinheiro na conta.
    default:
      return "PENDENTE";
  }
}

export function metodoDoPagamentoMercadoPago(tipo: string | undefined, meio: string | undefined): MetodoDoPagamento {
  if ((meio ?? "").toLowerCase() === "pix") {
    return "PIX";
  }

  switch ((tipo ?? "").toLowerCase()) {
    case "credit_card":
      return "CREDITO";

    case "debit_card":
      return "DEBITO";

    case "bank_transfer":
      return "PIX";

    default:
      return "OUTRO";
  }
}

// A forma de pagamento do pedido no Beatus (a modalidade é sempre eletrônica no site).
export function formaDoPedido(metodo: MetodoDoPagamento): "PIX" | "CARTAO" | "OUTRO" {
  return metodo === "PIX" ? "PIX" : metodo === "CREDITO" || metodo === "DEBITO" ? "CARTAO" : "OUTRO";
}

export const ROTULO_DO_METODO: Record<MetodoDoPagamento, string> = {
  PIX: "Pix",
  CREDITO: "cartão de crédito",
  DEBITO: "cartão de débito",
  OUTRO: "outro meio",
};
