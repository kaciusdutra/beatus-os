import { podeEntrarNaOperacao, podeUsarPagamentoNaEntrega } from "./paymentRules";

import type { Pedido } from "@/modules/pedidos/types/pedido";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function pedido(modalidade: "ELETRONICO" | "NA_ENTREGA", status: string): Pedido {
  return {
    total: 80,
    pagamento: { modalidade, status },
  } as unknown as Pedido;
}

function executarTestes(): void {
  // Pagamento eletrônico: só entra na operação depois de aprovado.
  verificar(podeEntrarNaOperacao(pedido("ELETRONICO", "APROVADO")), "eletrônico aprovado entra");
  verificar(!podeEntrarNaOperacao(pedido("ELETRONICO", "PENDENTE")), "eletrônico pendente não entra");

  // Pagar na entrega está bloqueado para todos até a fidelização existir.
  verificar(!podeEntrarNaOperacao(pedido("NA_ENTREGA", "PENDENTE")), "pagar na entrega não entra na operação");
  verificar(!podeUsarPagamentoNaEntrega(pedido("NA_ENTREGA", "PENDENTE")), "pagar na entrega não é permitido");
}

executarTestes();

console.log(`✅ Testes da regra de pagamento passaram (${verificacoes} verificações).`);
