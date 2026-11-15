import type { CobrancaCriada, GatewayDePagamento, PagamentoNoGateway, PedidoDeCobranca } from "./gatewayDePagamento";

import { metodoDoPagamentoMercadoPago, situacaoDoPagamentoMercadoPago } from "./statusDoGateway";

export interface ConfiguracaoMercadoPago {
  accessToken: string;
  // "sandbox" leva o cliente à página de teste; "producao", à de verdade.
  ambiente: "sandbox" | "producao";
  // Só para testes (um servidor falso) ou outra região.
  baseUrl?: string;
  // Só para testes.
  fetch?: typeof fetch;
  // Volta sozinho ao site depois de aprovar. O Mercado Pago só aceita com endereços https.
  retornoAutomatico?: boolean;
}

const TEMPO_LIMITE_MS = 10_000;

// Horário de Manaus (UTC-4, sem horário de verão) no formato que o Mercado Pago aceita.
export function dataComFusoDeManaus(data: Date): string {
  return new Date(data.getTime() - 4 * 3600_000).toISOString().replace("Z", "-04:00");
}

function numero(valor: unknown): number {
  return typeof valor === "number" ? valor : Number(valor);
}

export class MercadoPagoGateway implements GatewayDePagamento {
  readonly nome = "MERCADO_PAGO" as const;

  private readonly baseUrl: string;

  private readonly chamar: typeof fetch;

  constructor(private readonly configuracao: ConfiguracaoMercadoPago) {
    this.baseUrl = configuracao.baseUrl ?? "https://api.mercadopago.com";

    this.chamar = configuracao.fetch ?? fetch;
  }

  private async requisitar(caminho: string, opcoes: { metodo?: "GET" | "POST"; corpo?: unknown; idempotencia?: string } = {}): Promise<Response> {
    const controle = new AbortController();

    const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);

    try {
      return await this.chamar(`${this.baseUrl}${caminho}`, {
        method: opcoes.metodo ?? "GET",
        headers: {
          Authorization: `Bearer ${this.configuracao.accessToken}`,
          "Content-Type": "application/json",
          ...(opcoes.idempotencia ? { "X-Idempotency-Key": opcoes.idempotencia } : {}),
        },
        body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
        signal: controle.signal,
      });
    } finally {
      clearTimeout(relogio);
    }
  }

  async criarCobranca(pedido: PedidoDeCobranca): Promise<CobrancaCriada> {
    const corpo = {
      items: [{ id: pedido.checkoutId, title: pedido.descricao, quantity: 1, unit_price: pedido.total, currency_id: "BRL" }],
      payer: {
        name: pedido.pagador.nome,
        ...(pedido.pagador.email ? { email: pedido.pagador.email } : {}),
        identification: { type: "CPF", number: pedido.pagador.cpf },
      },
      // Só Pix, crédito e débito, sempre à vista (sem boleto, sem parcelas).
      payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 1 },
      back_urls: { success: pedido.urls.retorno, failure: pedido.urls.retorno, pending: pedido.urls.retorno },
      ...(this.configuracao.retornoAutomatico ? { auto_return: "approved" } : {}),
      notification_url: pedido.urls.notificacao,
      external_reference: pedido.checkoutId,
      statement_descriptor: "BEATUS",
      expires: true,
      expiration_date_from: dataComFusoDeManaus(new Date()),
      expiration_date_to: dataComFusoDeManaus(pedido.expiraEm),
    };

    const resposta = await this.requisitar("/checkout/preferences", { metodo: "POST", corpo, idempotencia: pedido.checkoutId });

    if (!resposta.ok) {
      // Só o que ajuda a achar o problema: nunca o token nem os dados do cliente.
      console.error("Mercado Pago recusou a preferência:", resposta.status, (await resposta.text().catch(() => "")).slice(0, 300));

      throw new Error(`O Mercado Pago não aceitou criar a cobrança (código ${resposta.status}).`);
    }

    const dados = (await resposta.json()) as { id?: string; init_point?: string; sandbox_init_point?: string };

    const checkoutUrl = this.configuracao.ambiente === "sandbox" ? (dados.sandbox_init_point ?? dados.init_point) : dados.init_point;

    if (!dados.id || !checkoutUrl) {
      throw new Error("O Mercado Pago respondeu sem o endereço de pagamento.");
    }

    return { preferenciaExterna: dados.id, checkoutUrl };
  }

  private paraPagamento(dados: Record<string, unknown>): PagamentoNoGateway {
    return {
      id: String(dados.id),
      statusBruto: typeof dados.status === "string" ? dados.status : "",
      situacao: situacaoDoPagamentoMercadoPago(typeof dados.status === "string" ? dados.status : undefined),
      metodo: metodoDoPagamentoMercadoPago(
        typeof dados.payment_type_id === "string" ? dados.payment_type_id : undefined,
        typeof dados.payment_method_id === "string" ? dados.payment_method_id : undefined
      ),
      valor: numero(dados.transaction_amount),
      referenciaExterna: typeof dados.external_reference === "string" && dados.external_reference ? dados.external_reference : undefined,
    };
  }

  async buscarPagamento(id: string): Promise<PagamentoNoGateway | null> {
    if (!/^\d{1,20}$/.test(id)) {
      return null;
    }

    const resposta = await this.requisitar(`/v1/payments/${id}`);

    if (resposta.status === 404) {
      return null;
    }

    if (!resposta.ok) {
      throw new Error(`Não foi possível consultar o pagamento no Mercado Pago (código ${resposta.status}).`);
    }

    return this.paraPagamento((await resposta.json()) as Record<string, unknown>);
  }

  async buscarPagamentosDoCheckout(checkoutId: string): Promise<PagamentoNoGateway[]> {
    const resposta = await this.requisitar(`/v1/payments/search?external_reference=${encodeURIComponent(checkoutId)}&sort=date_created&criteria=desc`);

    if (!resposta.ok) {
      throw new Error(`Não foi possível consultar os pagamentos no Mercado Pago (código ${resposta.status}).`);
    }

    const dados = (await resposta.json()) as { results?: Record<string, unknown>[] };

    return (dados.results ?? []).map((item) => this.paraPagamento(item));
  }
}
