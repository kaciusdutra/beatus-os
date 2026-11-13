import type { CanalMarketplace, EventoDaPlataforma } from "../types/marketplace";

// O que o Beatus precisa de uma plataforma (iFood, 99Food, Keeta). Cada
// plataforma tem o seu adaptador, que fala o formato e a autenticação dela e
// devolve tudo já no formato do Beatus. O resto do sistema não conhece o iFood.
export interface PlataformaMarketplacePort {
  canal: CanalMarketplace;

  // As credenciais (no .env do servidor) estão preenchidas?
  credenciaisConfiguradas(): boolean;

  // Eventos novos desde a última consulta, com o pedido completo nos de pedido novo.
  consultarEventos(): Promise<EventoDaPlataforma[]>;

  // Avisa à plataforma que os eventos foram recebidos (para não virem de novo).
  confirmarRecebimento(eventoIds: string[]): Promise<void>;

  // Aceita o pedido na plataforma.
  aceitarPedido(pedidoExternoId: string): Promise<void>;
}

export class PlataformaNaoAjustadaError extends Error {
  constructor(canal: string, motivo: string) {
    super(`Integração com ${canal}: ${motivo}`);

    this.name = "PlataformaNaoAjustadaError";
  }
}
