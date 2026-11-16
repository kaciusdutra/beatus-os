// Envio pela API oficial do WhatsApp (WhatsApp Business Cloud API, da Meta).
// - Com modelo aprovado configurado para o evento, envia a mensagem-modelo (a única forma de avisar o
//   cliente fora da janela de 24 horas da conversa). O modelo tem uma variável: o número do pedido.
// - Sem modelo, envia texto livre, que a Meta só entrega dentro da janela de 24 horas.

import { ErroDeEnvio, type EnviadorDeAviso, type MensagemDeAviso } from "./envioDeAvisos";

import type { EventoDoAviso } from "./avisoDoPedido";

export interface ConfiguracaoDoWhatsapp {
  accessToken: string;
  phoneNumberId: string;
  // Versão da API do Graph (ex.: v23.0). A Meta aposenta versões antigas, então é configurável.
  versaoDaApi?: string;
  // Só para testes com um servidor de mentira.
  baseUrl?: string;
  // Nome da mensagem-modelo aprovada para cada evento.
  modelos?: Partial<Record<EventoDoAviso, string>>;
  idioma?: string;
  fetcher?: typeof fetch;
}

export const VERSAO_PADRAO_DA_API = "v23.0";

export class WhatsAppCloudGateway implements EnviadorDeAviso {
  constructor(private readonly configuracao: ConfiguracaoDoWhatsapp) {}

  async enviar(mensagem: MensagemDeAviso): Promise<{ idExterno?: string }> {
    const { accessToken, phoneNumberId, versaoDaApi, baseUrl, modelos, idioma, fetcher } = this.configuracao;

    const modelo = modelos?.[mensagem.evento]?.trim();

    const corpo = modelo
      ? {
          messaging_product: "whatsapp",
          to: mensagem.telefone,
          type: "template",
          template: {
            name: modelo,
            language: { code: idioma?.trim() || "pt_BR" },
            components: [{ type: "body", parameters: [{ type: "text", text: mensagem.numeroDoPedido }] }],
          },
        }
      : {
          messaging_product: "whatsapp",
          to: mensagem.telefone,
          type: "text",
          text: { body: mensagem.texto, preview_url: false },
        };

    const endereco = `${(baseUrl ?? "https://graph.facebook.com").replace(/\/+$/, "")}/${versaoDaApi?.trim() || VERSAO_PADRAO_DA_API}/${phoneNumberId}/messages`;

    let resposta: Response;

    try {
      resposta = await (fetcher ?? fetch)(endereco, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ErroDeEnvio("Não foi possível falar com o WhatsApp (rede ou tempo esgotado).", false);
    }

    let dados: { messages?: { id?: string }[]; error?: { message?: string; code?: number; error_data?: { details?: string } } } | null = null;

    try {
      dados = await resposta.json();
    } catch {
      dados = null;
    }

    if (resposta.ok) {
      return { idExterno: dados?.messages?.[0]?.id };
    }

    const detalhe = dados?.error?.error_data?.details ?? dados?.error?.message ?? `resposta ${resposta.status}`;

    const codigo = dados?.error?.code !== undefined ? ` (código ${dados.error.code})` : "";

    // Limite de envios (429) e erro do servidor da Meta (5xx) passam sozinhos: tenta de novo. O resto
    // (telefone sem WhatsApp, fora da janela sem modelo, modelo não aprovado, token vencido) precisa de gente.
    const passageiro = resposta.status === 429 || resposta.status >= 500;

    throw new ErroDeEnvio(`WhatsApp recusou o aviso: ${detalhe}${codigo}`, !passageiro);
  }
}
