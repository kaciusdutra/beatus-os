import type { CheckoutRepositoryPort } from "../repositories/checkoutRepositoryPort";

import type { CheckoutSalvo, Estimativa, StatusPublicoDoCheckout } from "../types/checkout";

import { VERSAO_DA_POLITICA, validarEntradaDoCheckout, type DadosDoCheckout } from "./entradaDoCheckout";

import type { GatewayDePagamento, PagamentoNoGateway } from "./gatewayDePagamento";

import { ROTULO_DO_METODO, formaDoPedido, type MetodoDoPagamento } from "./statusDoGateway";

// ---------- Ports (o que o checkout precisa do resto do sistema) ----------

export interface PedidosDoCheckoutPort {
  // A mesma conta do PDV (preço do canal Site, taxa de entrega, total), sem gravar.
  calcular(itens: DadosDoCheckout["itens"], distanciaKm: number): Promise<{ subtotal: number; taxaEntrega: number; total: number; regraEntrega?: string }>;

  // Lança o pedido pelo mesmo caminho do PDV, já com o pagamento aprovado.
  lancar(dados: {
    checkoutId: string;
    clienteId: string;
    enderecoId?: string;
    dados: DadosDoCheckout;
    distanciaKm: number;
    forma: "PIX" | "CARTAO" | "OUTRO";
    transacaoExterna: string;
  }): Promise<{ pedidoId: string; numero: string; pagamentoId: string; total: number }>;

  numeroDoPedido(pedidoId: string): Promise<string | undefined>;
}

export interface ClientesDoCheckoutPort {
  // Acha o cliente pelo telefone (ou CPF) ou cadastra, grava os consentimentos e o endereço.
  garantir(dados: DadosDoCheckout, versaoDaPolitica: string): Promise<{ clienteId: string; enderecoId?: string }>;
}

export interface DistanciaDoEnderecoPort {
  // A distância até o endereço, descoberta pelo servidor. Nulo = fora da área.
  distanciaKm(cep: string): Promise<number | null>;
}

export interface FuncionamentoDoCheckoutPort {
  recebePedidos(): Promise<{ recebe: boolean; texto: string }>;
}

export type RegistrarNoDiarioDoSite = (dados: { acao: string; resumo: string; referenciaId?: string }) => Promise<void>;

// O gateway não está configurado (faltam as credenciais) ou o checkout não pode abrir agora.
export class CheckoutIndisponivel extends Error {}

// Erro que o cliente pode ler (dado inválido, fora da área, casa fechada). Qualquer outro
// erro é problema nosso e nunca vai para a tela com o texto técnico.
export class ErroDeCheckout extends Error {}

export const MINUTOS_DE_VALIDADE_DO_CHECKOUT = 30;

const TOLERANCIA_DO_VALOR = 0.01;

function dinheiro(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export class CheckoutService {
  constructor(
    private readonly dependencias: {
      repositorio: CheckoutRepositoryPort;
      pedidos: PedidosDoCheckoutPort;
      clientes: ClientesDoCheckoutPort;
      distancia: DistanciaDoEnderecoPort;
      funcionamento: FuncionamentoDoCheckoutPort;
      // Nulo quando as credenciais do gateway ainda não foram colocadas.
      gateway: GatewayDePagamento | null;
      registrar?: RegistrarNoDiarioDoSite;
      agora?: () => Date;
      novoId?: () => string;
    }
  ) {}

  private get agora(): Date {
    return (this.dependencias.agora ?? (() => new Date()))();
  }

  private validar(entrada: unknown): DadosDoCheckout {
    const resultado = validarEntradaDoCheckout(entrada, this.agora);

    if (!resultado.ok) {
      throw new ErroDeCheckout(resultado.mensagem);
    }

    return resultado.dados;
  }

  // ---------- Antes de pagar ----------

  // O total com a entrega, para mostrar ao cliente antes de ele pagar.
  async estimar(entrada: unknown): Promise<Estimativa> {
    const dados = this.validar(entrada);

    return this.calcular(dados);
  }

  private async calcular(dados: DadosDoCheckout): Promise<Estimativa & { regraEntrega?: string }> {
    const distanciaKm = await this.dependencias.distancia.distanciaKm(dados.endereco.cep);

    if (distanciaKm === null) {
      throw new ErroDeCheckout("Ainda não entregamos neste endereço. Confira o CEP ou fale com a gente.");
    }

    const calculo = await this.dependencias.pedidos.calcular(dados.itens, distanciaKm);

    return { subtotal: calculo.subtotal, taxaEntrega: calculo.taxaEntrega, total: calculo.total, distanciaKm, regraEntrega: calculo.regraEntrega };
  }

  // Abre o pagamento: guarda o que o cliente pediu e devolve a página de pagamento do gateway.
  async abrir(entrada: unknown, enderecoDoSite: string): Promise<{ checkoutId: string; checkoutUrl: string; total: number }> {
    const dados = this.validar(entrada);

    const { gateway, repositorio } = this.dependencias;

    if (!gateway) {
      throw new CheckoutIndisponivel("O pagamento online ainda não está disponível. Volte em breve.");
    }

    const funcionamento = await this.dependencias.funcionamento.recebePedidos();

    if (!funcionamento.recebe) {
      throw new ErroDeCheckout(`Não estamos recebendo pedidos agora. ${funcionamento.texto}`);
    }

    const calculo = await this.calcular(dados);

    const agora = this.agora;

    await repositorio.expirarVencidos(agora);

    const id = (this.dependencias.novoId ?? (() => crypto.randomUUID()))();

    const expiraEm = new Date(agora.getTime() + MINUTOS_DE_VALIDADE_DO_CHECKOUT * 60_000);

    await repositorio.criar({
      id,
      solicitado: { dados, distanciaKm: calculo.distanciaKm, regraEntrega: calculo.regraEntrega, versaoDaPolitica: VERSAO_DA_POLITICA },
      subtotal: calculo.subtotal,
      taxaEntrega: calculo.taxaEntrega,
      total: calculo.total,
      gateway: gateway.nome,
      expiraEm,
    });

    const base = enderecoDoSite.replace(/\/+$/, "");

    try {
      const cobranca = await gateway.criarCobranca({
        checkoutId: id,
        total: calculo.total,
        descricao: "Pedido Beatus Burger Delivery",
        pagador: { nome: dados.cliente.nome, cpf: dados.cliente.cpf, email: dados.cliente.email },
        urls: { retorno: `${base}/cardapio/pedido/${id}`, notificacao: `${base}/api/publico/mercadopago/webhook` },
        expiraEm,
      });

      await repositorio.atualizar(id, { preferenciaExterna: cobranca.preferenciaExterna, checkoutUrl: cobranca.checkoutUrl });

      return { checkoutId: id, checkoutUrl: cobranca.checkoutUrl, total: calculo.total };
    } catch (error) {
      await repositorio.atualizar(id, { status: "ERRO", erro: error instanceof Error ? error.message : "Falha ao abrir o pagamento." });

      throw new CheckoutIndisponivel("Não foi possível abrir o pagamento agora. Tente de novo em instantes.");
    }
  }

  // ---------- Depois de pagar ----------

  // Para a tela de acompanhamento. Se ainda está pendente, pergunta ao gateway (assim
  // funciona mesmo que o aviso automático demore).
  async status(id: string): Promise<StatusPublicoDoCheckout | null> {
    const { repositorio, gateway } = this.dependencias;

    let checkout = await repositorio.buscar(id);

    if (!checkout) {
      return null;
    }

    if ((checkout.status === "PENDENTE" || checkout.status === "RECUSADO") && gateway) {
      try {
        const pagamentos = await gateway.buscarPagamentosDoCheckout(id);

        const escolhido = pagamentos.find((pagamento) => pagamento.situacao === "APROVADO") ?? pagamentos[0];

        if (escolhido) {
          await this.aplicarPagamento(checkout, escolhido);
        }
      } catch (error) {
        console.error("Não foi possível conferir o pagamento no gateway:", error);
      }

      checkout = (await repositorio.buscar(id)) ?? checkout;
    }

    if ((checkout.status === "PENDENTE" || checkout.status === "RECUSADO") && checkout.expiraEm.getTime() < this.agora.getTime()) {
      checkout = await repositorio.atualizar(id, { status: "EXPIRADO" });
    }

    return this.paraOCliente(checkout);
  }

  private async paraOCliente(checkout: CheckoutSalvo): Promise<StatusPublicoDoCheckout> {
    const numero = checkout.pedidoId ? await this.dependencias.pedidos.numeroDoPedido(checkout.pedidoId) : undefined;

    const mensagens: Record<CheckoutSalvo["status"], string> = {
      PENDENTE: "Aguardando o pagamento.",
      PROCESSANDO: "Pagamento recebido. Estamos confirmando o seu pedido...",
      APROVADO: `Pagamento aprovado! Seu pedido${numero ? ` nº ${numero}` : ""} já foi para a cozinha.`,
      RECUSADO: "O pagamento foi recusado. Você pode tentar de novo com outro cartão ou pelo Pix.",
      EXPIRADO: "O tempo para pagar acabou. Monte o pedido de novo no cardápio.",
      CANCELADO: "O pagamento foi cancelado. Se foi engano, monte o pedido de novo.",
      ERRO: "Recebemos o seu pagamento, mas houve um problema ao registrar o pedido. A nossa equipe já foi avisada e vai falar com você.",
    };

    const podePagar = checkout.status === "PENDENTE" || checkout.status === "RECUSADO";

    return {
      status: checkout.status,
      mensagem: mensagens[checkout.status],
      total: checkout.total,
      numeroDoPedido: numero,
      checkoutUrl: podePagar ? checkout.checkoutUrl : undefined,
      expiraEm: checkout.expiraEm.toISOString(),
    };
  }

  // O aviso automático do gateway (webhook). Lança erro se o tratamento falhar, para
  // o gateway tentar de novo.
  async tratarAviso(aviso: { gateway: string; eventoId: string; tipo: string; dataId: string; corpo: unknown }): Promise<"PROCESSADO" | "IGNORADO"> {
    const { repositorio, gateway } = this.dependencias;

    const { jaProcessado } = await repositorio.registrarEvento({ gateway: aviso.gateway, eventoId: aviso.eventoId, transacaoExterna: aviso.dataId, tipo: aviso.tipo, payload: aviso.corpo });

    if (jaProcessado) {
      return "IGNORADO";
    }

    if (aviso.tipo !== "payment" || !gateway) {
      await repositorio.concluirEvento(aviso.gateway, aviso.eventoId, "IGNORADO");

      return "IGNORADO";
    }

    try {
      // O corpo do aviso nunca é a verdade: pergunta-se ao gateway.
      const pagamento = await gateway.buscarPagamento(aviso.dataId);

      const checkout = pagamento?.referenciaExterna ? await repositorio.buscar(pagamento.referenciaExterna) : null;

      if (!pagamento || !checkout) {
        await repositorio.concluirEvento(aviso.gateway, aviso.eventoId, "IGNORADO");

        return "IGNORADO";
      }

      await this.aplicarPagamento(checkout, pagamento);

      await repositorio.concluirEvento(aviso.gateway, aviso.eventoId, "PROCESSADO");

      return "PROCESSADO";
    } catch (error) {
      await repositorio.concluirEvento(aviso.gateway, aviso.eventoId, "ERRO", error instanceof Error ? error.message : "erro");

      throw error;
    }
  }

  private async aplicarPagamento(checkout: CheckoutSalvo, pagamento: PagamentoNoGateway): Promise<void> {
    const { repositorio, registrar } = this.dependencias;

    // Já virou pedido: o que chegar depois só vira aviso para a equipe.
    if (checkout.pedidoId || checkout.status === "APROVADO") {
      if (pagamento.situacao === "ESTORNADO" || pagamento.situacao === "CANCELADO") {
        await registrar?.({
          acao: "PAGAMENTO_ESTORNADO",
          resumo: `O pagamento do checkout do site foi ${pagamento.situacao === "ESTORNADO" ? "estornado" : "cancelado"} no gateway depois de aprovado. Conferir o pedido.`,
          referenciaId: checkout.id,
        });
      }

      return;
    }

    if (pagamento.situacao === "APROVADO") {
      await this.concluir(checkout, pagamento);

      return;
    }

    const metodo = pagamento.metodo === "OUTRO" ? undefined : pagamento.metodo;

    if (pagamento.situacao === "RECUSADO") {
      await repositorio.atualizar(checkout.id, { status: "RECUSADO", statusExterno: pagamento.statusBruto, ...(metodo ? { metodo } : {}) });

      return;
    }

    if (pagamento.situacao === "CANCELADO" || pagamento.situacao === "ESTORNADO") {
      await repositorio.atualizar(checkout.id, { status: "CANCELADO", statusExterno: pagamento.statusBruto });

      return;
    }

    // Ainda pendente: só anota o que se sabe.
    await repositorio.atualizar(checkout.id, { statusExterno: pagamento.statusBruto, ...(metodo ? { metodo } : {}) });
  }

  // O pagamento foi aprovado: cria o pedido, uma única vez.
  private async concluir(checkout: CheckoutSalvo, pagamento: PagamentoNoGateway): Promise<void> {
    const { repositorio, pedidos, clientes, registrar } = this.dependencias;

    if (Math.abs(pagamento.valor - checkout.total) > TOLERANCIA_DO_VALOR) {
      await repositorio.atualizar(checkout.id, {
        status: "ERRO",
        transacaoExterna: pagamento.id,
        statusExterno: pagamento.statusBruto,
        erro: `Valor pago (${dinheiro(pagamento.valor)}) diferente do total do pedido (${dinheiro(checkout.total)}).`,
      });

      await registrar?.({
        acao: "PAGAMENTO_COM_PROBLEMA",
        resumo: `Checkout do site com pagamento aprovado de valor diferente do total: pago ${dinheiro(pagamento.valor)}, total ${dinheiro(checkout.total)}. O pedido NÃO foi criado: conferir com o cliente.`,
        referenciaId: checkout.id,
      });

      return;
    }

    if (!(await repositorio.reservarParaProcessar(checkout.id))) {
      return;
    }

    try {
      const cliente = await clientes.garantir(checkout.solicitado.dados, checkout.solicitado.versaoDaPolitica);

      const lancado = await pedidos.lancar({
        checkoutId: checkout.id,
        clienteId: cliente.clienteId,
        enderecoId: cliente.enderecoId,
        dados: checkout.solicitado.dados,
        distanciaKm: checkout.solicitado.distanciaKm,
        forma: formaDoPedido(pagamento.metodo),
        transacaoExterna: pagamento.id,
      });

      // A referência do pagamento no gateway é auxiliar (serve para estornos): se não gravar,
      // o pedido já criado e pago segue, e a equipe é avisada para conferir.
      try {
        await repositorio.registrarPagamentoOnline({
          pagamentoId: lancado.pagamentoId,
          gateway: checkout.gateway,
          metodo: pagamento.metodo,
          transacaoExterna: pagamento.id,
          statusExterno: pagamento.statusBruto,
        });
      } catch (error) {
        console.error("Não foi possível gravar a referência do pagamento no gateway:", error);

        await registrar?.({
          acao: "PAGAMENTO_COM_PROBLEMA",
          resumo: `O pedido nº ${lancado.numero} foi criado, mas a referência do pagamento no gateway (${pagamento.id}) não foi gravada. Anotar para um eventual estorno.`,
          referenciaId: lancado.pedidoId,
        });
      }

      await repositorio.atualizar(checkout.id, {
        status: "APROVADO",
        pedidoId: lancado.pedidoId,
        transacaoExterna: pagamento.id,
        statusExterno: pagamento.statusBruto,
        metodo: pagamento.metodo === "OUTRO" ? undefined : pagamento.metodo,
        erro: null,
      });

      await registrar?.({
        acao: "PAGAMENTO_APROVADO",
        resumo: `Pagamento de ${dinheiro(pagamento.valor)} aprovado (${ROTULO_DO_METODO[pagamento.metodo]}). Pedido nº ${lancado.numero} criado e enviado para a cozinha.`,
        referenciaId: lancado.pedidoId,
      });

      if (Math.abs(lancado.total - checkout.total) > TOLERANCIA_DO_VALOR) {
        await registrar?.({
          acao: "PAGAMENTO_COM_PROBLEMA",
          resumo: `O total do pedido nº ${lancado.numero} (${dinheiro(lancado.total)}) difere do valor pago (${dinheiro(checkout.total)}): conferir (preço alterado durante o pagamento?).`,
          referenciaId: lancado.pedidoId,
        });
      }
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Erro ao criar o pedido.";

      await repositorio.atualizar(checkout.id, { status: "ERRO", transacaoExterna: pagamento.id, statusExterno: pagamento.statusBruto, erro: mensagem });

      await registrar?.({
        acao: "PAGAMENTO_COM_PROBLEMA",
        resumo: `Pagamento APROVADO no gateway, mas o pedido do site não foi criado: ${mensagem} O cliente já pagou: conferir e criar o pedido à mão.`,
        referenciaId: checkout.id,
      });

      // O erro sobe para o gateway repetir o aviso: a nova tentativa cria o pedido.
      throw error;
    }
  }
}

export type { MetodoDoPagamento };
