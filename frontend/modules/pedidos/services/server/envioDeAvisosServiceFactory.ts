import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { FilaDeAvisosRepositoryPostgres } from "../../repositories/postgres/filaDeAvisosRepositoryPostgres";

import { EnvioDeAvisosService, type EnviadorDeAviso } from "../envioDeAvisos";

import { WhatsAppCloudGateway } from "../whatsappCloudGateway";

// A conexão com o WhatsApp vem do .env (veja docs/WHATSAPP_AVISOS.md). Sem token e número, nada é enviado.
function criarEnviador(): EnviadorDeAviso | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!accessToken || !phoneNumberId) {
    return null;
  }

  return new WhatsAppCloudGateway({
    accessToken,
    phoneNumberId,
    versaoDaApi: process.env.WHATSAPP_API_VERSION?.trim() || undefined,
    // Só para testes com um servidor de mentira; em uso normal não existe.
    baseUrl: process.env.WHATSAPP_BASE_URL?.trim() || undefined,
    idioma: process.env.WHATSAPP_IDIOMA?.trim() || undefined,
    modelos: {
      EM_PREPARO: process.env.WHATSAPP_MODELO_EM_PREPARO?.trim() || undefined,
      A_CAMINHO: process.env.WHATSAPP_MODELO_A_CAMINHO?.trim() || undefined,
      ENTREGUE: process.env.WHATSAPP_MODELO_ENTREGUE?.trim() || undefined,
    },
  });
}

export function getEnvioDeAvisosService(): EnvioDeAvisosService {
  return new EnvioDeAvisosService({
    fila: new FilaDeAvisosRepositoryPostgres(criarContextoDesenvolvimento()),
    enviador: criarEnviador(),
  });
}
