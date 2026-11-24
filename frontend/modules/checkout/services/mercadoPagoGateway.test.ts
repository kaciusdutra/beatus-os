import { MercadoPagoGateway, custosDoPagamento } from "./mercadoPagoGateway";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

{
  const custos = custosDoPagamento({
    fee_details: [
      { type: "mercadopago_fee", amount: 1.19, fee_payer: "collector" },
      { type: "financing_fee", amount: 0.1, fee_payer: "payer" },
    ],
    transaction_details: { net_received_amount: 58.81 },
    money_release_date: "2026-11-25T10:00:00.000-04:00",
  });

  verificar(custos.taxa === 1.19, "só a taxa cobrada de nós entra");
  verificar(custos.valorLiquido === 58.81, "valor líquido lido");
  verificar(custos.liberadoEm?.toISOString() === "2026-11-25T14:00:00.000Z", "data de liberação lida");
}

{
  const vazio = custosDoPagamento({ status: "approved" });

  verificar(vazio.taxa === undefined && vazio.valorLiquido === undefined && vazio.liberadoEm === undefined, "sem os campos, nada é inventado");

  const estranho = custosDoPagamento({ fee_details: [{ amount: "abc" }, { amount: -3 }], transaction_details: { net_received_amount: null }, money_release_date: "lixo" });

  verificar(estranho.taxa === 0 && estranho.valorLiquido === undefined && estranho.liberadoEm === undefined, "valores estranhos são ignorados");

  verificar(custosDoPagamento({ fee_details: [{ amount: 0.1 }, { amount: 0.2 }] }).taxa === 0.3, "soma sem erro de ponto flutuante");
}

void (async () => {
  const resposta = { id: 123, status: "approved", payment_type_id: "credit_card", payment_method_id: "visa", transaction_amount: 60, external_reference: "abc", fee_details: [{ amount: 2.4, fee_payer: "collector" }], transaction_details: { net_received_amount: 57.6 } };

  const gateway = new MercadoPagoGateway({ accessToken: "TEST", ambiente: "sandbox", fetch: (async () => new Response(JSON.stringify(resposta), { status: 200 })) as typeof fetch });

  const pagamento = await gateway.buscarPagamento("123");

  verificar(pagamento?.taxa === 2.4 && pagamento.valorLiquido === 57.6 && pagamento.valor === 60, "o gateway devolve taxa e líquido junto do pagamento");

  console.log(`✅ Testes do gateway Mercado Pago passaram (${verificacoes} verificações).`);
})();
