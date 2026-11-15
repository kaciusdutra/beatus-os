import type { DadosDoCheckout } from "../services/entradaDoCheckout";

import type { MetodoDoPagamento, StatusDoCheckout } from "../services/statusDoGateway";

// O que fica guardado do pedido do site até o pagamento ser aprovado.
export interface SolicitadoDoCheckout {
  dados: DadosDoCheckout;
  // Calculada pelo servidor a partir do endereço (nunca vem do navegador).
  distanciaKm: number;
  regraEntrega?: string;
  versaoDaPolitica: string;
}

export interface CheckoutSalvo {
  id: string;
  status: StatusDoCheckout;
  solicitado: SolicitadoDoCheckout;
  subtotal: number;
  taxaEntrega: number;
  total: number;
  gateway: string;
  preferenciaExterna?: string;
  checkoutUrl?: string;
  metodo?: MetodoDoPagamento;
  transacaoExterna?: string;
  statusExterno?: string;
  expiraEm: Date;
  pedidoId?: string;
  erro?: string;
  criadoEm: Date;
}

export interface NovoCheckout {
  id: string;
  solicitado: SolicitadoDoCheckout;
  subtotal: number;
  taxaEntrega: number;
  total: number;
  gateway: string;
  expiraEm: Date;
}

export interface MudancasDoCheckout {
  status?: StatusDoCheckout;
  preferenciaExterna?: string;
  checkoutUrl?: string;
  metodo?: MetodoDoPagamento;
  transacaoExterna?: string;
  statusExterno?: string;
  erro?: string | null;
  pedidoId?: string;
}

// O que o cliente pode saber do próprio checkout (nada de dados pessoais).
export interface StatusPublicoDoCheckout {
  status: StatusDoCheckout;
  mensagem: string;
  total: number;
  numeroDoPedido?: string;
  // Só depois de aprovado: em que pé está o pedido (NOVO, EM_PREPARO, PRONTO, EM_ROTA, ENTREGUE, CANCELADO).
  situacao?: "NOVO" | "EM_PREPARO" | "PRONTO" | "EM_ROTA" | "ENTREGUE" | "CANCELADO";
  // Só enquanto dá para pagar (ou tentar de novo).
  checkoutUrl?: string;
  expiraEm: string;
}

export interface Estimativa {
  subtotal: number;
  taxaEntrega: number;
  total: number;
  distanciaKm: number;
}
