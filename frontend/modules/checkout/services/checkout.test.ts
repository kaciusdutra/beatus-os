import { createHmac } from "node:crypto";

import { validarAssinaturaMercadoPago } from "./assinaturaMercadoPago";

import { VERSAO_DA_POLITICA, dataDeNascimentoValida, validarEntradaDoCheckout } from "./entradaDoCheckout";

import { MercadoPagoGateway, dataComFusoDeManaus } from "./mercadoPagoGateway";

import { formaDoPedido, metodoDoPagamentoMercadoPago, situacaoDoPagamentoMercadoPago } from "./statusDoGateway";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

async function executarTestes(): Promise<void> {
  // ---------- Entrada do checkout ----------
  const boa = {
    cliente: { nome: "  Maria   da Silva ", telefone: "(92) 99123-4567", cpf: "529.982.247-25", email: "Maria@Exemplo.com", dataNascimento: "1990-05-20" },
    endereco: { cep: "69000-001", logradouro: "Rua Afrânio de Castro", numero: "699", complemento: "Apto 2", bairro: "Japiim", cidade: "Manaus", estado: "am" },
    itens: [{ produtoId: "p1", quantidade: 2, observacao: "sem cebola" }, { produtoId: "p2", quantidade: 1 }],
    consentimentos: { aceitaPolitica: true, aceitaMarketing: true },
  };

  const ok = validarEntradaDoCheckout(boa);

  verificar(ok.ok && ok.dados.cliente.nome === "Maria da Silva", "nome limpo");
  verificar(ok.ok && ok.dados.cliente.telefone === "92991234567" && ok.dados.cliente.cpf === "52998224725", "telefone e CPF só com números");
  verificar(ok.ok && ok.dados.cliente.email === "maria@exemplo.com", "e-mail em minúsculas");
  verificar(ok.ok && ok.dados.endereco.estado === "AM" && ok.dados.endereco.cep === "69000001", "UF maiúscula e CEP só números");
  verificar(ok.ok && ok.dados.consentimentos.aceitaMarketing === true, "marketing só se marcou");

  const recusa = (alteracao: (c: typeof boa) => void): string => {
    const copia = JSON.parse(JSON.stringify(boa));

    alteracao(copia);

    const resultado = validarEntradaDoCheckout(copia);

    return resultado.ok ? "" : resultado.mensagem;
  };

  verificar(recusa((c) => (c.cliente.nome = "A")).includes("nome"), "nome curto");
  verificar(recusa((c) => (c.cliente.telefone = "123")).includes("telefone"), "telefone curto");
  verificar(recusa((c) => (c.cliente.telefone = "(92) 88123-4567")).includes("telefone"), "celular sem o 9");
  verificar(recusa((c) => (c.cliente.telefone = "(05) 99123-4567")).includes("telefone"), "DDD inválido");
  verificar(validarEntradaDoCheckout({ ...boa, cliente: { ...boa.cliente, telefone: "+55 92 99123-4567" } }).ok, "telefone com +55 é aceito");
  verificar(recusa((c) => (c.cliente.cpf = "111.111.111-11")).includes("CPF"), "CPF repetido");
  verificar(recusa((c) => (c.cliente.cpf = "529.982.247-26")).includes("CPF"), "CPF com dígito errado");
  verificar(recusa((c) => (c.cliente.email = "sem-arroba")).includes("e-mail"), "e-mail inválido");
  verificar(recusa((c) => (c.cliente.dataNascimento = "2999-01-01")).includes("nascimento"), "nascimento no futuro");
  verificar(recusa((c) => (c.cliente.dataNascimento = "1990-02-31")).includes("nascimento"), "data que não existe");
  verificar(recusa((c) => (c.endereco.cep = "123")).includes("CEP"), "CEP curto");
  verificar(recusa((c) => (c.endereco.numero = "")).includes("endereço"), "sem número");
  verificar(recusa((c) => (c.endereco.estado = "Amazonas")).includes("endereço"), "estado por extenso");
  verificar(recusa((c) => (c.consentimentos.aceitaPolitica = false)).includes("privacidade"), "sem aceitar a política");
  verificar(recusa((c) => (c.itens = [])).includes("pelo menos um item"), "sem itens");
  verificar(recusa((c) => (c.itens[0].quantidade = 0)).includes("quantidade"), "quantidade zero");
  verificar(recusa((c) => (c.itens[0].quantidade = 1.5)).includes("quantidade"), "quantidade quebrada");
  verificar(recusa((c) => (c.itens[0].quantidade = 21)).includes("quantidade"), "quantidade demais");
  verificar(recusa((c) => (c.itens[1].produtoId = "p1")).includes("duas vezes"), "produto repetido");
  verificar(recusa((c) => (c.itens = Array.from({ length: 31 }, (_, i) => ({ produtoId: `p${i}`, quantidade: 1 })) as typeof c.itens)).includes("até 30"), "itens demais");
  verificar(!validarEntradaDoCheckout(null).ok && !validarEntradaDoCheckout("texto").ok && !validarEntradaDoCheckout({}).ok, "corpo vazio ou estranho");

  // Marketing não marcado = falso (nunca assumido).
  const semMarketing = validarEntradaDoCheckout({ ...boa, consentimentos: { aceitaPolitica: true } });

  verificar(semMarketing.ok && semMarketing.dados.consentimentos.aceitaMarketing === false, "marketing desmarcado por padrão");

  // Texto sujo: caracteres de controle e tamanho.
  const sujo = validarEntradaDoCheckout({ ...boa, cliente: { ...boa.cliente, nome: "Zé\u0000\u0007\n da  Silva" + "x".repeat(200) } });

  verificar(sujo.ok && sujo.dados.cliente.nome.length === 80 && !/[\u0000-\u001f]/.test(sujo.dados.cliente.nome), "nome sem controle e limitado");
  verificar(dataDeNascimentoValida("2000-02-29") && !dataDeNascimentoValida("2001-02-29") && !dataDeNascimentoValida("1899-01-01"), "datas de nascimento");
  verificar(VERSAO_DA_POLITICA.length > 0, "versão da política definida");

  // ---------- Status do gateway ----------
  verificar(situacaoDoPagamentoMercadoPago("approved") === "APROVADO", "approved");
  verificar(situacaoDoPagamentoMercadoPago("pending") === "PENDENTE" && situacaoDoPagamentoMercadoPago("in_process") === "PENDENTE", "pendentes");
  verificar(situacaoDoPagamentoMercadoPago("authorized") === "PENDENTE", "autorizado ainda não é aprovado");
  verificar(situacaoDoPagamentoMercadoPago("rejected") === "RECUSADO", "rejected");
  verificar(situacaoDoPagamentoMercadoPago("cancelled") === "CANCELADO", "cancelled");
  verificar(situacaoDoPagamentoMercadoPago("refunded") === "ESTORNADO" && situacaoDoPagamentoMercadoPago("charged_back") === "ESTORNADO", "estornos");
  verificar(situacaoDoPagamentoMercadoPago("status-novo") === "PENDENTE" && situacaoDoPagamentoMercadoPago(undefined) === "PENDENTE", "desconhecido nunca aprova");
  verificar(metodoDoPagamentoMercadoPago("credit_card", "visa") === "CREDITO", "crédito");
  verificar(metodoDoPagamentoMercadoPago("debit_card", "debelo") === "DEBITO", "débito");
  verificar(metodoDoPagamentoMercadoPago("bank_transfer", "pix") === "PIX", "Pix");
  verificar(metodoDoPagamentoMercadoPago("account_money", "account_money") === "OUTRO", "saldo da conta do Mercado Pago");
  verificar(formaDoPedido("PIX") === "PIX" && formaDoPedido("CREDITO") === "CARTAO" && formaDoPedido("DEBITO") === "CARTAO" && formaDoPedido("OUTRO") === "OUTRO", "forma no pedido");

  // ---------- Assinatura do aviso ----------
  const segredo = "segredo-de-teste";

  const assinar = (dataId: string, requestId: string, ts: string) => createHmac("sha256", segredo).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");

  const v1 = assinar("123456", "req-1", "1700000000000");

  verificar(validarAssinaturaMercadoPago({ xSignature: `ts=1700000000000,v1=${v1}`, xRequestId: "req-1", dataId: "123456", segredo }), "assinatura certa");
  verificar(!validarAssinaturaMercadoPago({ xSignature: `ts=1700000000000,v1=${v1}`, xRequestId: "req-1", dataId: "999999", segredo }), "outro id não passa");
  verificar(!validarAssinaturaMercadoPago({ xSignature: `ts=1700000000001,v1=${v1}`, xRequestId: "req-1", dataId: "123456", segredo }), "outro ts não passa");
  verificar(!validarAssinaturaMercadoPago({ xSignature: `ts=1700000000000,v1=${v1}`, xRequestId: "req-1", dataId: "123456", segredo: "outro" }), "outra chave não passa");
  verificar(!validarAssinaturaMercadoPago({ xSignature: `ts=1700000000000,v1=${"0".repeat(64)}`, xRequestId: "req-1", dataId: "123456", segredo }), "assinatura inventada");
  verificar(!validarAssinaturaMercadoPago({ xSignature: null, xRequestId: "req-1", dataId: "123456", segredo }), "sem cabeçalho");
  verificar(!validarAssinaturaMercadoPago({ xSignature: "lixo", xRequestId: "req-1", dataId: "123456", segredo }), "cabeçalho estragado");
  verificar(!validarAssinaturaMercadoPago({ xSignature: `ts=1,v1=${v1}`, xRequestId: null, dataId: null, segredo: "" }), "sem chave nada passa");
  verificar(validarAssinaturaMercadoPago({ xSignature: `ts=1700000000000,v1=${assinar("abcdef", "req-1", "1700000000000")}`, xRequestId: "req-1", dataId: "ABCDEF", segredo }), "id com letras entra em minúsculas");

  // ---------- Adaptador do Mercado Pago (com respostas simuladas) ----------
  const chamadas: { url: string; metodo: string; cabecalhos: Record<string, string>; corpo?: Record<string, unknown> }[] = [];

  const responder = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

  let proximaResposta: () => Response = () => responder({});

  const falso = (async (url: string | URL | Request, opcoes?: RequestInit) => {
    chamadas.push({
      url: String(url),
      metodo: opcoes?.method ?? "GET",
      cabecalhos: (opcoes?.headers ?? {}) as Record<string, string>,
      corpo: opcoes?.body ? JSON.parse(String(opcoes.body)) : undefined,
    });

    return proximaResposta();
  }) as typeof fetch;

  const gateway = new MercadoPagoGateway({ accessToken: "TOKEN-SECRETO", ambiente: "sandbox", baseUrl: "https://mp.teste", fetch: falso, retornoAutomatico: true });

  const pedido = {
    checkoutId: "chk-1",
    total: 62.9,
    descricao: "Pedido Beatus Burger Delivery",
    pagador: { nome: "Maria", cpf: "52998224725", email: "maria@exemplo.com" },
    urls: { retorno: "https://site.teste/cardapio/pedido/chk-1", notificacao: "https://site.teste/api/publico/mercadopago/webhook" },
    expiraEm: new Date("2026-11-15T20:30:00Z"),
  };

  proximaResposta = () => responder({ id: "pref-1", init_point: "https://mp/real", sandbox_init_point: "https://mp/teste" }, 201);

  const cobranca = await gateway.criarCobranca(pedido);

  verificar(cobranca.preferenciaExterna === "pref-1" && cobranca.checkoutUrl === "https://mp/teste", "no sandbox usa o endereço de teste");
  verificar(chamadas[0].url === "https://mp.teste/checkout/preferences" && chamadas[0].metodo === "POST", "chama a rota certa");
  verificar(chamadas[0].cabecalhos.Authorization === "Bearer TOKEN-SECRETO" && chamadas[0].cabecalhos["X-Idempotency-Key"] === "chk-1", "token e chave de idempotência");

  const enviado = chamadas[0].corpo as Record<string, unknown>;

  verificar(enviado.external_reference === "chk-1" && enviado.auto_return === "approved", "referência e retorno automático");
  verificar((enviado.items as { unit_price: number }[])[0].unit_price === 62.9, "valor cobrado é o total do servidor");
  verificar(JSON.stringify(enviado.payment_methods) === JSON.stringify({ excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 1 }), "sem boleto e sem parcelamento");
  verificar(enviado.notification_url === pedido.urls.notificacao && enviado.statement_descriptor === "BEATUS", "aviso e nome na fatura");
  verificar(String(enviado.expiration_date_to) === "2026-11-15T16:30:00.000-04:00", "validade no horário de Manaus");
  verificar(dataComFusoDeManaus(new Date("2026-11-15T20:30:00Z")) === "2026-11-15T16:30:00.000-04:00", "formato da data");

  const emProducao = new MercadoPagoGateway({ accessToken: "T", ambiente: "producao", baseUrl: "https://mp.teste", fetch: falso });

  verificar((await emProducao.criarCobranca(pedido)).checkoutUrl === "https://mp/real", "em produção usa o endereço real");
  verificar(!("auto_return" in (chamadas[chamadas.length - 1].corpo as object)), "sem retorno automático quando não é https");

  proximaResposta = () => responder({ message: "invalid" }, 400);

  const silencio = console.error;

  console.error = () => undefined;

  let mensagemDeErro = "";

  try {
    await gateway.criarCobranca(pedido);
  } catch (error) {
    mensagemDeErro = error instanceof Error ? error.message : "";
  }

  console.error = silencio;

  verificar(mensagemDeErro.includes("400") && !mensagemDeErro.includes("TOKEN-SECRETO"), "erro do gateway sem vazar o token");

  proximaResposta = () => responder({ id: "x" }, 201);

  let semUrl = false;

  try {
    await gateway.criarCobranca(pedido);
  } catch {
    semUrl = true;
  }

  verificar(semUrl, "resposta sem endereço de pagamento é erro");

  proximaResposta = () => responder({ id: 987654321, status: "approved", payment_type_id: "debit_card", payment_method_id: "debelo", transaction_amount: 62.9, external_reference: "chk-1" });

  const pagamento = await gateway.buscarPagamento("987654321");

  verificar(pagamento?.situacao === "APROVADO" && pagamento.metodo === "DEBITO" && pagamento.valor === 62.9 && pagamento.referenciaExterna === "chk-1" && pagamento.id === "987654321", "lê o pagamento");

  const antes = chamadas.length;

  verificar((await gateway.buscarPagamento("../../admin")) === null && chamadas.length === antes, "id estranho nem chega ao gateway");

  proximaResposta = () => responder({}, 404);

  verificar((await gateway.buscarPagamento("123")) === null, "pagamento inexistente");

  proximaResposta = () => responder({ results: [{ id: 1, status: "pending", payment_type_id: "bank_transfer", payment_method_id: "pix", transaction_amount: 10, external_reference: "chk-1" }, { id: 2, status: "approved", payment_type_id: "credit_card", transaction_amount: 10 }] });

  const lista = await gateway.buscarPagamentosDoCheckout("chk-1");

  verificar(lista.length === 2 && lista[0].metodo === "PIX" && lista[1].situacao === "APROVADO", "lista os pagamentos do checkout");
  verificar(chamadas[chamadas.length - 1].url.includes("external_reference=chk-1"), "busca pela referência");

  proximaResposta = () => responder({}, 500);

  let falhou = false;

  try {
    await gateway.buscarPagamentosDoCheckout("chk-1");
  } catch {
    falhou = true;
  }

  verificar(falhou, "falha do gateway ao listar vira erro");
}

void executarTestes().then(() => {
  console.log(`✅ Testes do checkout (entrada, status, assinatura e Mercado Pago) passaram (${verificacoes} verificações).`);
});
