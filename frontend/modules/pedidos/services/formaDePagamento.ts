// Como o dinheiro do pedido entrou, em palavras claras, para o PDV e a consulta de
// pedidos mostrarem em qualquer canal: o meio (Pix, crédito, débito...) e quem o
// confirmou (o Mercado Pago sozinho, a plataforma, a equipe).

export interface PagamentoParaRotulo {
  // Pix, CARTAO, DINHEIRO, IFOOD, 99FOOD, KEETA, OUTRO ou A_DEFINIR
  forma: string;
  // PDV_INTERNO, CHECKOUT_ONLINE, MARKETPLACE ou ENTREGA
  origem?: string;
  // Do gateway, quando o pagamento passou por ele
  online?: { metodo?: string | null; gateway?: string | null } | null;
}

const NOME_DO_GATEWAY: Record<string, string> = {
  MERCADO_PAGO: "Mercado Pago",
};

const PLATAFORMAS: Record<string, string> = {
  IFOOD: "iFood",
  "99FOOD": "99Food",
  KEETA: "Keeta",
};

export function rotuloDoPagamento(pagamento: PagamentoParaRotulo): string {
  const gateway = pagamento.online?.gateway ? (NOME_DO_GATEWAY[pagamento.online.gateway] ?? pagamento.online.gateway) : undefined;

  const metodo = pagamento.online?.metodo ?? undefined;

  if (PLATAFORMAS[pagamento.forma]) {
    return `${PLATAFORMAS[pagamento.forma]} (pago na plataforma)`;
  }

  switch (pagamento.forma) {
    case "PIX":
      if (gateway) {
        return `Pix (${gateway}, confirmado sozinho)`;
      }

      return pagamento.origem === "PDV_INTERNO" ? "Pix (confirmado pela equipe)" : "Pix";

    case "CARTAO": {
      const tipo = metodo === "CREDITO" ? "Cartão de crédito" : metodo === "DEBITO" ? "Cartão de débito" : "Cartão";

      return gateway ? `${tipo} (${gateway})` : tipo;
    }

    case "DINHEIRO":
      return "Dinheiro";

    case "A_DEFINIR":
      return "A definir";

    case "OUTRO":
      return "Outra forma";

    default:
      return pagamento.forma;
  }
}
