import type { CheckoutRepositoryPort } from "../repositories/checkoutRepositoryPort";

import type { CheckoutSalvo, MudancasDoCheckout, NovoCheckout } from "../types/checkout";

import {
  CheckoutIndisponivel,
  CheckoutService,
  MINUTOS_DE_VALIDADE_DO_CHECKOUT,
  type ClientesDoCheckoutPort,
  type PedidosDoCheckoutPort,
} from "./checkoutService";

import type { GatewayDePagamento, PagamentoNoGateway, PedidoDeCobranca } from "./gatewayDePagamento";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

async function recusa(promessa: Promise<unknown>): Promise<Error | null> {
  try {
    await promessa;
  } catch (error) {
    return error instanceof Error ? error : new Error("erro");
  }

  return null;
}

let relogio = new Date("2026-11-18T22:00:00Z");

class RepositorioFalso implements CheckoutRepositoryPort {
  checkouts = new Map<string, CheckoutSalvo>();
  eventos = new Map<string, string>();
  pagamentosOnline: { pagamentoId: string; transacaoExterna: string }[] = [];

  async criar(novo: NovoCheckout) {
    const salvo: CheckoutSalvo = { ...novo, status: "PENDENTE", criadoEm: relogio };

    this.checkouts.set(novo.id, salvo);

    return { ...salvo };
  }
  async buscar(id: string) {
    const c = this.checkouts.get(id);

    return c ? { ...c } : null;
  }
  async atualizar(id: string, mudancas: MudancasDoCheckout) {
    const c = this.checkouts.get(id)!;

    const { erro, ...resto } = mudancas;

    Object.assign(c, resto);

    if (erro !== undefined) {
      c.erro = erro ?? undefined;
    }

    return { ...c };
  }
  async reservarParaProcessar(id: string) {
    const c = this.checkouts.get(id);

    if (!c || c.status === "APROVADO" || c.status === "PROCESSANDO") {
      return false;
    }

    c.status = "PROCESSANDO";

    return true;
  }
  async expirarVencidos(agora: Date) {
    let n = 0;

    for (const c of this.checkouts.values()) {
      if (c.status === "PENDENTE" && c.expiraEm < agora) {
        c.status = "EXPIRADO";

        n++;
      }
    }

    return n;
  }
  async registrarEvento(e: { gateway: string; eventoId: string }) {
    const chave = `${e.gateway}:${e.eventoId}`;

    const anterior = this.eventos.get(chave);

    if (!anterior) {
      this.eventos.set(chave, "RECEBIDO");
    }

    return { jaProcessado: anterior === "PROCESSADO" };
  }
  async concluirEvento(gateway: string, eventoId: string, status: string) {
    this.eventos.set(`${gateway}:${eventoId}`, status);
  }
  falharAoGravarReferencia = false;
  async registrarPagamentoOnline(d: { pagamentoId: string; transacaoExterna: string }) {
    if (this.falharAoGravarReferencia) {
      throw new Error("referência duplicada");
    }

    this.pagamentosOnline.push(d);
  }
}

class PedidosFalsos implements PedidosDoCheckoutPort {
  lancados: Parameters<PedidosDoCheckoutPort["lancar"]>[0][] = [];
  falhasAoLancar = 0;
  totalDeDiferenca = 0;
  contador = 100;
  porId = new Map<string, { pedidoId: string; numero: string; pagamentoId: string; total: number }>();

  canaisCalculados: string[] = [];
  async calcular(itens: { produtoId: string; quantidade: number }[], distanciaKm: number, canal: string) {
    this.canaisCalculados.push(canal);

    if (itens.some((item) => item.produtoId === "sem-preco")) {
      throw new Error("O produto não tem preço neste canal.");
    }

    const subtotal = itens.reduce((soma, item) => soma + 20 * item.quantidade, 0);

    const taxaEntrega = distanciaKm <= 1 ? 0 : 5;

    return { subtotal, taxaEntrega, total: subtotal + taxaEntrega, regraEntrega: "FAIXA" };
  }
  async lancar(dados: Parameters<PedidosDoCheckoutPort["lancar"]>[0]) {
    if (this.falhasAoLancar > 0) {
      this.falhasAoLancar--;

      throw new Error("Banco indisponível.");
    }

    // O mesmo id nunca cria dois pedidos (como no sistema de verdade).
    const existente = this.porId.get(dados.checkoutId);

    if (existente) {
      return existente;
    }

    this.lancados.push(dados);

    this.contador++;

    const subtotal = dados.dados.itens.reduce((soma, item) => soma + 20 * item.quantidade, 0);

    const resultado = { pedidoId: dados.checkoutId, numero: String(this.contador), pagamentoId: `pg-${this.contador}`, total: subtotal + (dados.distanciaKm <= 1 ? 0 : 5) + this.totalDeDiferenca };

    this.porId.set(dados.checkoutId, resultado);

    return resultado;
  }
  async numeroDoPedido(pedidoId: string) {
    return this.porId.get(pedidoId)?.numero;
  }
  situacao: "NOVO" | "EM_PREPARO" | "PRONTO" | "EM_ROTA" | "ENTREGUE" | "CANCELADO" = "NOVO";
  async situacaoDoPedido() {
    return this.situacao;
  }
}

class ClientesFalsos implements ClientesDoCheckoutPort {
  chamadas = 0;
  async garantir() {
    this.chamadas++;

    return { clienteId: "cli-1", enderecoId: "end-1" };
  }
}

class GatewayFalso implements GatewayDePagamento {
  nome = "MERCADO_PAGO" as const;
  cobrancas: PedidoDeCobranca[] = [];
  pagamentos = new Map<string, PagamentoNoGateway>();
  falharAoCriar = false;
  falharAoConsultar = false;

  async criarCobranca(pedido: PedidoDeCobranca) {
    if (this.falharAoCriar) {
      throw new Error("Mercado Pago fora do ar");
    }

    this.cobrancas.push(pedido);

    return { preferenciaExterna: `pref-${pedido.checkoutId}`, checkoutUrl: `https://mp.teste/pagar/${pedido.checkoutId}` };
  }
  async buscarPagamento(id: string) {
    if (this.falharAoConsultar) {
      throw new Error("consulta falhou");
    }

    return this.pagamentos.get(id) ?? null;
  }
  async buscarPagamentosDoCheckout(checkoutId: string) {
    if (this.falharAoConsultar) {
      throw new Error("consulta falhou");
    }

    return [...this.pagamentos.values()].filter((pagamento) => pagamento.referenciaExterna === checkoutId);
  }
}

const pagamento = (id: string, checkoutId: string, situacao: PagamentoNoGateway["situacao"], valor: number, metodo: PagamentoNoGateway["metodo"] = "PIX"): PagamentoNoGateway => ({
  id,
  statusBruto: situacao === "APROVADO" ? "approved" : situacao.toLowerCase(),
  situacao,
  metodo,
  valor,
  referenciaExterna: checkoutId,
});

const ENTRADA = {
  cliente: { nome: "Maria", telefone: "92991234567", cpf: "52998224725", email: "maria@exemplo.com" },
  endereco: { cep: "69000-001", logradouro: "Rua A", numero: "1", bairro: "Japiim", cidade: "Manaus", estado: "AM" },
  itens: [{ produtoId: "p1", quantidade: 2 }],
  consentimentos: { aceitaPolitica: true, aceitaMarketing: false },
};

function montar(opcoes: { gateway?: GatewayFalso | null; aberto?: boolean; distancia?: number | null } = {}) {
  const repositorio = new RepositorioFalso();

  const pedidos = new PedidosFalsos();

  const clientes = new ClientesFalsos();

  const gateway = opcoes.gateway === undefined ? new GatewayFalso() : opcoes.gateway;

  const diario: { acao: string; resumo: string }[] = [];

  let sequencia = 0;

  const servico = new CheckoutService({
    repositorio,
    pedidos,
    clientes,
    distancia: { distanciaKm: async () => (opcoes.distancia === undefined ? 2.4 : opcoes.distancia) },
    funcionamento: { recebePedidos: async () => ({ recebe: opcoes.aberto ?? true, texto: "Abrimos amanhã às 18:00." }) },
    gateway,
    registrar: async (d) => void diario.push(d),
    agora: () => relogio,
    novoId: () => `chk-${++sequencia}`,
  });

  return { servico, repositorio, pedidos, clientes, gateway, diario };
}

async function executarTestes(): Promise<void> {
  // ---------- Estimativa ----------
  {
    const { servico } = montar();

    const estimativa = await servico.estimar(ENTRADA);

    verificar(estimativa.subtotal === 40 && estimativa.taxaEntrega === 5 && estimativa.total === 45 && estimativa.distanciaKm === 2.4, "estimativa com a entrega do servidor");
    verificar((await recusa(servico.estimar({ ...ENTRADA, cliente: { ...ENTRADA.cliente, cpf: "111" } })))?.message.includes("CPF") === true, "dados inválidos são recusados");
    verificar((await recusa(montar({ distancia: null }).servico.estimar(ENTRADA)))?.message.includes("não entregamos") === true, "fora da área");
    verificar((await recusa(servico.estimar({ ...ENTRADA, itens: [{ produtoId: "sem-preco", quantidade: 1 }] })))?.message.includes("preço") === true, "produto sem preço no canal");
  }

  // ---------- Abrir o pagamento ----------
  {
    const { servico, repositorio, gateway, diario } = montar();

    // O que o navegador mandar de preço/total/distância é ignorado: o servidor decide.
    const aberto = await servico.abrir({ ...ENTRADA, total: 1, taxaEntrega: 0, distanciaKm: 0, itens: [{ produtoId: "p1", quantidade: 2, preco: 0.01 }] }, "https://site.teste/");

    verificar(aberto.checkoutId === "chk-1" && aberto.total === 45 && aberto.checkoutUrl.endsWith("/chk-1"), "abre e devolve a página de pagamento");

    const guardado = repositorio.checkouts.get("chk-1")!;

    verificar(guardado.status === "PENDENTE" && guardado.total === 45 && guardado.solicitado.distanciaKm === 2.4, "guarda o que o servidor calculou");
    verificar(guardado.expiraEm.getTime() === relogio.getTime() + MINUTOS_DE_VALIDADE_DO_CHECKOUT * 60_000, "valida por 30 minutos");
    verificar(guardado.solicitado.dados.consentimentos.aceitaPolitica === true && guardado.solicitado.versaoDaPolitica.length > 0, "guarda o aceite da política e a versão");
    verificar(gateway!.cobrancas[0].total === 45 && gateway!.cobrancas[0].checkoutId === "chk-1", "cobra o total do servidor");
    verificar(gateway!.cobrancas[0].urls.retorno === "https://site.teste/cardapio/pedido/chk-1" && gateway!.cobrancas[0].urls.notificacao === "https://site.teste/api/publico/mercadopago/webhook", "endereços de retorno e de aviso");
    verificar(guardado.checkoutUrl === aberto.checkoutUrl && guardado.preferenciaExterna === "pref-chk-1", "guarda a preferência do gateway");
    verificar(diario.length === 0, "abrir ainda não é venda: nada no diário");
  }

  // Casa fechada, sem credenciais, falha do gateway.
  {
    verificar((await recusa(montar({ aberto: false }).servico.abrir(ENTRADA, "https://s")))?.message.includes("Não estamos recebendo pedidos") === true, "casa fechada não abre pagamento");
    verificar((await recusa(montar({ gateway: null }).servico.abrir(ENTRADA, "https://s"))) instanceof CheckoutIndisponivel, "sem credenciais do gateway");

    const { servico, repositorio, gateway } = montar();

    gateway!.falharAoCriar = true;

    const erro = await recusa(servico.abrir(ENTRADA, "https://s"));

    verificar(erro instanceof CheckoutIndisponivel && !erro.message.includes("fora do ar"), "falha do gateway sem detalhe técnico para o cliente");
    verificar(repositorio.checkouts.get("chk-1")?.status === "ERRO" && repositorio.checkouts.get("chk-1")?.erro === "Mercado Pago fora do ar", "falha guardada para a equipe");
  }

  // ---------- Pagamento aprovado: pedido criado uma vez ----------
  {
    const { servico, repositorio, pedidos, clientes, gateway, diario } = montar();

    await servico.abrir(ENTRADA, "https://s");

    gateway!.pagamentos.set("9001", pagamento("9001", "chk-1", "APROVADO", 45, "CREDITO"));

    const aviso = { gateway: "MERCADO_PAGO", eventoId: "req-1", tipo: "payment", dataId: "9001", corpo: {} };

    verificar((await servico.tratarAviso(aviso)) === "PROCESSADO", "aviso aprovado é processado");
    verificar(pedidos.lancados.length === 1 && pedidos.lancados[0].forma === "CARTAO" && pedidos.lancados[0].transacaoExterna === "9001", "pedido lançado com a forma e a transação");
    verificar(pedidos.lancados[0].checkoutId === "chk-1" && pedidos.lancados[0].clienteId === "cli-1", "o id do checkout é a chave de idempotência do pedido");
    verificar(repositorio.checkouts.get("chk-1")?.status === "APROVADO" && repositorio.checkouts.get("chk-1")?.pedidoId === "chk-1", "checkout aprovado com o pedido ligado");
    verificar(repositorio.pagamentosOnline[0]?.transacaoExterna === "9001", "referência do gateway ligada ao pagamento");
    verificar(diario.some((d) => d.acao === "PAGAMENTO_APROVADO" && d.resumo.includes("cartão de crédito")), "venda no diário");

    // O mesmo aviso de novo, e outro aviso do mesmo pagamento: nada de segundo pedido.
    verificar((await servico.tratarAviso(aviso)) === "IGNORADO", "aviso repetido é ignorado");

    await servico.tratarAviso({ ...aviso, eventoId: "req-2" });

    verificar(pedidos.lancados.length === 1 && clientes.chamadas === 1, "um pedido só, mesmo com avisos repetidos");

    // Pelo status também (volta do cliente ao site).
    const status = await servico.status("chk-1");

    verificar(status?.status === "APROVADO" && status.numeroDoPedido === "101" && status.mensagem.includes("nº 101") && status.checkoutUrl === undefined, "tela de acompanhamento");

    // Depois de aprovado, o cliente acompanha a situação real do pedido.
    verificar(status?.situacao === "NOVO", "situação inicial do pedido");

    pedidos.situacao = "EM_ROTA";

    const aCaminho = await servico.status("chk-1");

    verificar(aCaminho?.situacao === "EM_ROTA" && aCaminho.mensagem.includes("a caminho") && aCaminho.mensagem.includes("nº 101"), "mensagem acompanha a entrega");

    pedidos.situacao = "CANCELADO";

    verificar((await servico.status("chk-1"))?.mensagem.includes("cancelado") === true, "pedido cancelado avisa");
  }

  // Dois avisos ao mesmo tempo (aviso + volta do cliente).
  {
    const { servico, pedidos, gateway } = montar();

    await servico.abrir(ENTRADA, "https://s");

    gateway!.pagamentos.set("9002", pagamento("9002", "chk-1", "APROVADO", 45));

    await Promise.all([
      servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "a", tipo: "payment", dataId: "9002", corpo: {} }),
      servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "b", tipo: "payment", dataId: "9002", corpo: {} }),
      servico.status("chk-1"),
    ]);

    verificar(pedidos.lancados.length === 1, "avisos simultâneos criam um pedido só");
  }

  // ---------- Pendente, recusado, depois aprovado ----------
  {
    const { servico, repositorio, pedidos, gateway } = montar();

    await servico.abrir(ENTRADA, "https://s");

    gateway!.pagamentos.set("1", pagamento("1", "chk-1", "PENDENTE", 45));

    await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "e1", tipo: "payment", dataId: "1", corpo: {} });

    verificar(pedidos.lancados.length === 0 && repositorio.checkouts.get("chk-1")?.status === "PENDENTE", "pendente não cria pedido");

    gateway!.pagamentos.set("1", pagamento("1", "chk-1", "RECUSADO", 45, "CREDITO"));

    await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "e2", tipo: "payment", dataId: "1", corpo: {} });

    verificar(repositorio.checkouts.get("chk-1")?.status === "RECUSADO" && pedidos.lancados.length === 0, "recusado não cria pedido");

    const recusado = await servico.status("chk-1");

    verificar(recusado?.checkoutUrl !== undefined && recusado.mensagem.includes("recusado"), "recusado ainda deixa tentar de novo");

    gateway!.pagamentos.set("2", pagamento("2", "chk-1", "APROVADO", 45, "PIX"));

    await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "e3", tipo: "payment", dataId: "2", corpo: {} });

    verificar(pedidos.lancados.length === 1 && pedidos.lancados[0].forma === "PIX", "a segunda tentativa aprovada cria o pedido");
  }

  // ---------- Valor diferente do total ----------
  {
    const { servico, repositorio, pedidos, gateway, diario } = montar();

    await servico.abrir(ENTRADA, "https://s");

    gateway!.pagamentos.set("3", pagamento("3", "chk-1", "APROVADO", 10));

    await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "v1", tipo: "payment", dataId: "3", corpo: {} });

    verificar(pedidos.lancados.length === 0 && repositorio.checkouts.get("chk-1")?.status === "ERRO", "valor diferente não cria pedido");
    verificar(diario.some((d) => d.acao === "PAGAMENTO_COM_PROBLEMA" && d.resumo.includes("NÃO foi criado")), "equipe é avisada");
    verificar((await servico.status("chk-1"))?.mensagem.includes("equipe já foi avisada") === true, "cliente é avisado sem detalhe técnico");
  }

  // ---------- Falha ao criar o pedido: o gateway repete e funciona ----------
  {
    const { servico, repositorio, pedidos, gateway, diario } = montar();

    await servico.abrir(ENTRADA, "https://s");

    gateway!.pagamentos.set("4", pagamento("4", "chk-1", "APROVADO", 45));

    pedidos.falhasAoLancar = 1;

    const aviso = { gateway: "MERCADO_PAGO", eventoId: "f1", tipo: "payment", dataId: "4", corpo: {} };

    verificar((await recusa(servico.tratarAviso(aviso)))?.message === "Banco indisponível.", "a falha sobe, para o gateway repetir");
    verificar(repositorio.checkouts.get("chk-1")?.status === "ERRO" && diario.some((d) => d.resumo.includes("O cliente já pagou")), "estado de erro e aviso à equipe");
    verificar(repositorio.eventos.get("MERCADO_PAGO:f1") === "ERRO", "o aviso fica marcado com erro");

    verificar((await servico.tratarAviso(aviso)) === "PROCESSADO", "o mesmo aviso repetido (mesmo código) é tentado de novo");
    verificar(pedidos.lancados.length === 1 && repositorio.checkouts.get("chk-1")?.status === "APROVADO", "e agora o pedido é criado");
  }

  // ---------- Avisos que não interessam ----------
  {
    const { servico, pedidos, gateway } = montar();

    await servico.abrir(ENTRADA, "https://s");

    verificar((await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "x1", tipo: "merchant_order", dataId: "1", corpo: {} })) === "IGNORADO", "outros tipos de aviso");
    verificar((await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "x2", tipo: "payment", dataId: "inexistente", corpo: {} })) === "IGNORADO", "pagamento que o gateway não conhece (aviso de teste)");

    gateway!.pagamentos.set("5", { ...pagamento("5", "chk-1", "APROVADO", 45), referenciaExterna: "de-outra-loja" });

    verificar((await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "x3", tipo: "payment", dataId: "5", corpo: {} })) === "IGNORADO", "referência que não é nossa");

    gateway!.pagamentos.set("6", { ...pagamento("6", "chk-1", "APROVADO", 45), referenciaExterna: undefined });

    verificar((await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "x4", tipo: "payment", dataId: "6", corpo: {} })) === "IGNORADO", "pagamento sem referência");
    verificar(pedidos.lancados.length === 0, "nada disso cria pedido");
  }

  // ---------- Acompanhamento: pergunta ao gateway, expira, inexistente ----------
  {
    const { servico, pedidos, gateway } = montar();

    await servico.abrir(ENTRADA, "https://s");

    gateway!.pagamentos.set("7", pagamento("7", "chk-1", "APROVADO", 45));

    const status = await servico.status("chk-1");

    verificar(status?.status === "APROVADO" && pedidos.lancados.length === 1, "a volta do cliente confirma sem esperar o aviso");

    gateway!.falharAoConsultar = true;

    verificar((await servico.status("chk-1"))?.status === "APROVADO", "gateway fora do ar não derruba a tela");
    verificar((await servico.status("nao-existe")) === null, "checkout inexistente");
  }

  {
    const { servico, repositorio, gateway } = montar();

    await servico.abrir(ENTRADA, "https://s");

    relogio = new Date(relogio.getTime() + 31 * 60_000);

    const expirado = await servico.status("chk-1");

    verificar(expirado?.status === "EXPIRADO" && expirado.checkoutUrl === undefined, "passada a validade, expira");

    // Pagamento que chega depois de expirar vale: o dinheiro entrou.
    gateway!.pagamentos.set("8", pagamento("8", "chk-1", "APROVADO", 45));

    await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "t1", tipo: "payment", dataId: "8", corpo: {} });

    verificar(repositorio.checkouts.get("chk-1")?.status === "APROVADO", "pagamento aprovado depois de expirar ainda cria o pedido");

    relogio = new Date("2026-11-18T22:00:00Z");
  }

  // Estorno depois de aprovado: só avisa a equipe.
  {
    const { servico, pedidos, gateway, diario } = montar();

    await servico.abrir(ENTRADA, "https://s");

    gateway!.pagamentos.set("9", pagamento("9", "chk-1", "APROVADO", 45));

    await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "s1", tipo: "payment", dataId: "9", corpo: {} });

    gateway!.pagamentos.set("9", pagamento("9", "chk-1", "ESTORNADO", 45));

    await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "s2", tipo: "payment", dataId: "9", corpo: {} });

    verificar(pedidos.lancados.length === 1 && diario.some((d) => d.acao === "PAGAMENTO_ESTORNADO"), "estorno vira aviso para a equipe, sem mexer no pedido");
  }

  // Total do pedido diferente do pago (preço mudou durante o pagamento): cria e avisa.
  {
    const { servico, pedidos, gateway, diario } = montar();

    await servico.abrir(ENTRADA, "https://s");

    pedidos.totalDeDiferenca = 2;

    gateway!.pagamentos.set("10", pagamento("10", "chk-1", "APROVADO", 45));

    await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "d1", tipo: "payment", dataId: "10", corpo: {} });

    verificar(pedidos.lancados.length === 1 && diario.some((d) => d.resumo.includes("difere do valor pago")), "pedido criado e diferença sinalizada");
  }

  // A referência do gateway não grava: o pedido pago segue e a equipe é avisada.
  {
    const { servico, repositorio, pedidos, gateway, diario } = montar();

    await servico.abrir(ENTRADA, "https://s");

    repositorio.falharAoGravarReferencia = true;

    gateway!.pagamentos.set("12", pagamento("12", "chk-1", "APROVADO", 45));

    const silencio = console.error;

    console.error = () => undefined;

    await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "r1", tipo: "payment", dataId: "12", corpo: {} });

    console.error = silencio;

    verificar(pedidos.lancados.length === 1 && repositorio.checkouts.get("chk-1")?.status === "APROVADO", "referência que não grava não trava o pedido pago");
    verificar(diario.some((d) => d.acao === "PAGAMENTO_COM_PROBLEMA" && d.resumo.includes("referência do pagamento")), "equipe é avisada da referência não gravada");
  }

  // Origem WhatsApp (link da Beatriz): o cálculo e o pedido seguem o canal de origem.
  {
    const { servico, pedidos, gateway } = montar();

    await servico.estimar({ ...ENTRADA, origem: "WHATSAPP" });
    await servico.estimar({ ...ENTRADA, origem: "inventada" });
    await servico.estimar(ENTRADA);

    verificar(pedidos.canaisCalculados.join(",") === "WHATSAPP,CARDAPIO_ONLINE,CARDAPIO_ONLINE", "origem WhatsApp chega ao cálculo; origem inventada vira o site");

    await servico.abrir({ ...ENTRADA, origem: "WHATSAPP" }, "https://s");

    gateway!.pagamentos.set("13", pagamento("13", "chk-1", "APROVADO", 45));

    await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "w1", tipo: "payment", dataId: "13", corpo: {} });

    verificar(pedidos.lancados[0]?.dados.origem === "WHATSAPP", "o pedido é lançado com a origem WhatsApp");
  }

  // Cancelado antes de aprovar.
  {
    const { servico, repositorio, gateway } = montar();

    await servico.abrir(ENTRADA, "https://s");

    gateway!.pagamentos.set("11", pagamento("11", "chk-1", "CANCELADO", 45));

    await servico.tratarAviso({ gateway: "MERCADO_PAGO", eventoId: "c1", tipo: "payment", dataId: "11", corpo: {} });

    verificar(repositorio.checkouts.get("chk-1")?.status === "CANCELADO", "cancelado fica cancelado");
  }
}

void executarTestes().then(() => {
  console.log(`✅ Testes do serviço do checkout passaram (${verificacoes} verificações).`);
});
