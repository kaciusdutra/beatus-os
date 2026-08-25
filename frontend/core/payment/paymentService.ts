import {
  FormaPagamento,
  ModalidadePagamento,
  PagamentoPedido,
  StatusPagamento,
} from "@/modules/pedidos/types/pedido";

export interface PaymentSimulationResult {
  pagamento: PagamentoPedido;

  mensagem: string;
}

export function criarPagamentoSimulado(
  valor: number,
  modalidade: ModalidadePagamento,
  forma: FormaPagamento
): PaymentSimulationResult {
  const agora =
    new Date().toISOString();

  if (
    modalidade ===
    "NA_ENTREGA"
  ) {
    return {
      pagamento: {
        modalidade,

        forma,

        status: "PENDENTE",

        origem: "ENTREGA",

        valor,

        cobrancaNoPdvHabilitada:
          false,

        confirmacaoAutomatica:
          false,

        criadoEm: agora,
      },

      mensagem:
        "Pagamento definido para a entrega.",
    };
  }

  return {
    pagamento: {
      modalidade,

      forma,

      status:
        "AGUARDANDO_PAGAMENTO",

      origem:
        "PDV_INTERNO",

      valor,

      cobrancaNoPdvHabilitada:
        true,

      confirmacaoAutomatica:
        true,

      criadoEm: agora,
    },

    mensagem:
      "Cobrança eletrônica criada. Aguardando confirmação do pagamento.",
  };
}

export function aprovarPagamentoSimulado(
  pagamento: PagamentoPedido
): PagamentoPedido {
  const agora =
    new Date().toISOString();

  return {
    ...pagamento,

    status: "APROVADO",

    aprovadoEm: agora,
  };
}

export function atualizarStatusPagamento(
  pagamento: PagamentoPedido,
  status: StatusPagamento
): PagamentoPedido {
  return {
    ...pagamento,

    status,
  };
}