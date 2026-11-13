import type { CanalMarketplace, EventoDaPlataforma } from "../types/marketplace";

import type { PlataformaMarketplacePort } from "./plataformaPort";

// Plataforma de mentira para testar o caminho inteiro sem credenciais. Os
// eventos entram pela tela de simulação, não por consulta; o aceite não faz nada.
export class PlataformaSimulada implements PlataformaMarketplacePort {
  constructor(readonly canal: CanalMarketplace) {}

  credenciaisConfiguradas(): boolean {
    return true;
  }

  async consultarEventos(): Promise<EventoDaPlataforma[]> {
    return [];
  }

  async confirmarRecebimento(): Promise<void> {
    return;
  }

  async aceitarPedido(): Promise<void> {
    return;
  }
}
