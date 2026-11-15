import { rotuloDoPagamento } from "./formaDePagamento";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

verificar(rotuloDoPagamento({ forma: "PIX", origem: "CHECKOUT_ONLINE", online: { metodo: "PIX", gateway: "MERCADO_PAGO" } }) === "Pix (Mercado Pago, confirmado sozinho)", "Pix do site");
verificar(rotuloDoPagamento({ forma: "PIX", origem: "PDV_INTERNO" }) === "Pix (confirmado pela equipe)", "Pix manual do PDV");
verificar(rotuloDoPagamento({ forma: "PIX", origem: "CHECKOUT_ONLINE" }) === "Pix", "Pix sem detalhe");
verificar(rotuloDoPagamento({ forma: "CARTAO", online: { metodo: "CREDITO", gateway: "MERCADO_PAGO" } }) === "Cartão de crédito (Mercado Pago)", "crédito");
verificar(rotuloDoPagamento({ forma: "CARTAO", online: { metodo: "DEBITO", gateway: "MERCADO_PAGO" } }) === "Cartão de débito (Mercado Pago)", "débito");
verificar(rotuloDoPagamento({ forma: "CARTAO" }) === "Cartão", "cartão sem detalhe (pedido antigo)");
verificar(rotuloDoPagamento({ forma: "CARTAO", online: { metodo: null, gateway: "MERCADO_PAGO" } }) === "Cartão (Mercado Pago)", "cartão do gateway sem o tipo");
verificar(rotuloDoPagamento({ forma: "IFOOD", origem: "MARKETPLACE" }) === "iFood (pago na plataforma)", "iFood");
verificar(rotuloDoPagamento({ forma: "99FOOD" }) === "99Food (pago na plataforma)" && rotuloDoPagamento({ forma: "KEETA" }) === "Keeta (pago na plataforma)", "outras plataformas");
verificar(rotuloDoPagamento({ forma: "DINHEIRO" }) === "Dinheiro" && rotuloDoPagamento({ forma: "A_DEFINIR" }) === "A definir" && rotuloDoPagamento({ forma: "OUTRO" }) === "Outra forma", "outras formas");
verificar(rotuloDoPagamento({ forma: "NOVA_FORMA" }) === "NOVA_FORMA", "forma desconhecida aparece como veio");
verificar(rotuloDoPagamento({ forma: "CARTAO", online: { metodo: "CREDITO", gateway: "OUTRO_GATEWAY" } }) === "Cartão de crédito (OUTRO_GATEWAY)", "gateway desconhecido");

console.log(`✅ Testes do rótulo da forma de pagamento passaram (${verificacoes} verificações).`);
