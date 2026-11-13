import type { ConferenciaMarketplaceRepositoryPort } from "../repositories/conferenciaMarketplaceRepositoryPort";

import type {
  ConferenciaDoMarketplace,
  ConferirPedido,
  PedidoDoMarketplace,
  StatusDaConferencia,
} from "../types/conferenciaMarketplace";

import { resumirConferencia } from "./resumirConferencia";

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

export class ConferenciaMarketplaceService {
  constructor(private readonly repository: ConferenciaMarketplaceRepositoryPort) {}

  async listar(
    status?: string
  ): Promise<{ pedidos: PedidoDoMarketplace[]; resumo: ConferenciaDoMarketplace }> {
    if (status && status !== "AGUARDANDO" && status !== "CONFERIDO") {
      throw new Error("Situação da conferência inválida.");
    }

    // O resumo olha todos os pedidos; a lista pode vir filtrada.
    const todos = await this.repository.listar();

    const pedidos = status
      ? todos.filter((pedido) => pedido.status === (status as StatusDaConferencia))
      : todos;

    return { pedidos: pedidos.reverse(), resumo: resumirConferencia(todos) };
  }

  async conferir(
    pedidoId: string,
    dados: ConferirPedido,
    operador?: string | null
  ): Promise<PedidoDoMarketplace> {
    if (!Number.isFinite(dados.valorRecebido) || dados.valorRecebido < 0) {
      throw new Error("Informe o valor recebido (pode ser zero se a plataforma não pagou).");
    }

    if (
      !FORMATO_DATA.test(dados.recebidoEm) ||
      Number.isNaN(new Date(`${dados.recebidoEm}T12:00:00`).getTime())
    ) {
      throw new Error("Informe a data do recebimento (AAAA-MM-DD).");
    }

    return this.repository.conferir(
      pedidoId,
      {
        valorRecebido: Math.round(dados.valorRecebido * 100) / 100,
        recebidoEm: dados.recebidoEm,
        observacao: dados.observacao?.trim() || undefined,
      },
      operador
    );
  }
}
