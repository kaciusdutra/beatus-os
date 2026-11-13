import type { CanalMarketplace, EventoDaPlataforma } from "../types/marketplace";

import {
  PlataformaNaoAjustadaError,
  type PlataformaMarketplacePort,
} from "./plataformaPort";

// Adaptador do iFood.
//
// ESTADO: esqueleto. Ainda NÃO fala com o iFood, de propósito: os endereços, o
// formato dos eventos e dos pedidos e o prazo para aceitar precisam ser lidos da
// documentação oficial (developer.ifood.com.br), que o Beatus ainda não viu, e
// não vale chutar. Quando o Kacius trouxer a documentação, um exemplo real de
// pedido e as credenciais, só ESTE arquivo muda.
//
// Credenciais (somente no .env do servidor, nunca no banco nem no código):
//   IFOOD_CLIENT_ID
//   IFOOD_CLIENT_SECRET
// O código da loja no iFood fica na tela de integração (não é segredo).
export class IfoodPlataforma implements PlataformaMarketplacePort {
  readonly canal: CanalMarketplace = "IFOOD";

  credenciaisConfiguradas(): boolean {
    return Boolean(process.env.IFOOD_CLIENT_ID && process.env.IFOOD_CLIENT_SECRET);
  }

  private pendente(): never {
    throw new PlataformaNaoAjustadaError(
      "iFood",
      this.credenciaisConfiguradas()
        ? "o adaptador ainda precisa ser ajustado à documentação oficial do iFood (endereços e formato dos pedidos)."
        : "as credenciais (IFOOD_CLIENT_ID e IFOOD_CLIENT_SECRET) ainda não foram colocadas no .env."
    );
  }

  async consultarEventos(): Promise<EventoDaPlataforma[]> {
    return this.pendente();
  }

  async confirmarRecebimento(): Promise<void> {
    return this.pendente();
  }

  async aceitarPedido(): Promise<void> {
    return this.pendente();
  }
}
