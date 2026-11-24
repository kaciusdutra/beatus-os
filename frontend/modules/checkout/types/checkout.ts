import type { DadosDoCheckout } from "../services/entradaDoCheckout";

import type { MetodoDoPagamento, StatusDoCheckout } from "../services/statusDoGateway";

// O que fica guardado do pedido do site até o pagamento ser aprovado.
export interface SolicitadoDoCheckout {
  dados: DadosDoCheckout;
  // Calculada pelo servidor a partir do endereço (nunca vem do navegador).
  distanciaKm: number;
  regraEntrega?: string;
  versaoDaPolitica: string;
  // Clube: a vantagem usada neste pedido, resolvida na hora de abrir o pagamento (o pedido sai com o mesmo desconto que o cliente pagou).
  vantagemDoClube?: VantagemDoCheckout;
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
  // Código do cartão do clube do cliente (link /cardapio/clube/<codigo>). Só com o clube ligado e cartão existente.
  cartaoDoClube?: string;
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
  // Clube (seção 28): o que a vantagem escolhida abateu, quando entrou na conta.
  descontos?: number;
  vantagem?: { nome?: string; tipo: string; valorNosItens: number; valorNaEntrega: number };
}

// A vantagem do clube já resolvida pelo servidor (vem do banco, nunca do navegador).
export interface VantagemDoCheckout {
  resgateId: string;
  regra: { tipo: "ITEM_GRATIS" | "DESCONTO_PERCENTUAL" | "ENTREGA_GRATIS"; nome?: string; categoria?: string | null; valorMaximo?: number | null; percentual?: number | null };
}
