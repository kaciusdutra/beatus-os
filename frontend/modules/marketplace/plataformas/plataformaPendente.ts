import type { CanalMarketplace, EventoDaPlataforma } from "../types/marketplace";

import {
  PlataformaNaoAjustadaError,
  type PlataformaMarketplacePort,
} from "./plataformaPort";

// Plataformas que ainda não têm adaptador (99Food e Keeta). O canal já existe no
// Beatus; falta o adaptador que fala o formato de cada uma.
export class PlataformaPendente implements PlataformaMarketplacePort {
  constructor(readonly canal: CanalMarketplace) {}

  credenciaisConfiguradas(): boolean {
    return false;
  }

  private pendente(): never {
    throw new PlataformaNaoAjustadaError(this.canal, "ainda não há adaptador para esta plataforma.");
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
