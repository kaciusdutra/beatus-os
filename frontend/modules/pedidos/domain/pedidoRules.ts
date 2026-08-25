import {
  CanalPedido,
  EntradaPedido,
  Pedido,
} from "../types/pedido";

import {
  podeEntrarNaOperacao,
} from "@/core/payment/paymentRules";

export function pedidoEhManual(
  entrada: EntradaPedido
): boolean {
  return entrada === "MANUAL";
}

export function pedidoEhEletronico(
  entrada: EntradaPedido
): boolean {
  return entrada !== "MANUAL";
}

export function pedidoPodeSerCobradoNoPdv(
  entrada: EntradaPedido
): boolean {
  return pedidoEhManual(
    entrada
  );
}

export function pedidoPodeEntrarNaOperacao(
  pedido: Pedido
): boolean {
  return podeEntrarNaOperacao(
    pedido
  );
}

export function canalExigePagamentoProcessadoNaOrigem(
  canal: CanalPedido
): boolean {
  return (
    canal === "IFOOD" ||
    canal === "99FOOD" ||
    canal === "KEETA"
  );
}