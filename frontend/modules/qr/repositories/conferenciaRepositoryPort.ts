import type { ConferenciaDoItem } from "../types/qr";

// Conferências feitas pelo QR (o item foi lido e conferido).
export interface ConferenciaRepositoryPort {
  registrar(dados: {
    itemTipo: string;
    itemId: string;
    nome: string;
    operador?: string | null;
  }): Promise<void>;

  // Conferências desde o início do dia informado (hora local do servidor), da mais nova para a mais antiga.
  desde(inicio: Date): Promise<ConferenciaDoItem[]>;
}
