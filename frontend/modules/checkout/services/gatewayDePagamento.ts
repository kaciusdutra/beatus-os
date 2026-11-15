import type { MetodoDoPagamento, SituacaoDoPagamento } from "./statusDoGateway";

// O que o Beatus precisa de um gateway de pagamento. O Mercado Pago é o primeiro;
// trocar de gateway é escrever outro adaptador desta interface.

export interface PedidoDeCobranca {
  // Identificador do checkout no Beatus: volta nos avisos como referência.
  checkoutId: string;
  total: number;
  descricao: string;
  pagador: { nome: string; cpf: string; email?: string };
  urls: { retorno: string; notificacao: string };
  expiraEm: Date;
}

export interface CobrancaCriada {
  preferenciaExterna: string;
  checkoutUrl: string;
}

export interface PagamentoNoGateway {
  id: string;
  statusBruto: string;
  situacao: SituacaoDoPagamento;
  metodo: MetodoDoPagamento;
  valor: number;
  referenciaExterna?: string;
}

export interface GatewayDePagamento {
  nome: "MERCADO_PAGO";

  // Cria a página de pagamento (o cartão é digitado lá, nunca no Beatus).
  criarCobranca(pedido: PedidoDeCobranca): Promise<CobrancaCriada>;

  // A fonte da verdade: o que o gateway diz de um pagamento.
  buscarPagamento(id: string): Promise<PagamentoNoGateway | null>;

  // Todos os pagamentos feitos para um checkout (pela referência).
  buscarPagamentosDoCheckout(checkoutId: string): Promise<PagamentoNoGateway[]>;
}
