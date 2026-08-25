import {
  Pedido,
  StatusOperacional,
} from "../types/pedido";

import {
  getPedidoRepository,
} from "../repositories/pedidoRepository";

export interface AtualizarStatusPedidoInput {
  pedidoId: string;

  status:
    | StatusOperacional;
}

export class PedidoService {
  private readonly repository =
    getPedidoRepository();

  async criarPedido(
    pedido: Pedido
  ): Promise<Pedido> {
    return this.repository.criar(
      pedido
    );
  }

  async buscarPorId(
    pedidoId: string
  ): Promise<
    Pedido | undefined
  > {
    return this.repository.buscarPorId(
      pedidoId
    );
  }

  async listarPedidos(): Promise<
    Pedido[]
  > {
    return this.repository.listar();
  }

  async buscarPorCliente(
    clienteId: string
  ): Promise<Pedido[]> {
    return this.repository.buscarPorCliente(
      clienteId
    );
  }

  async atualizarPedido(
    pedido: Pedido
  ): Promise<Pedido> {
    const existente =
      await this.repository.buscarPorId(
        pedido.id
      );

    if (!existente) {
      throw new Error(
        "Pedido não encontrado."
      );
    }

    return this.repository.atualizar(
      pedido
    );
  }

  async atualizarStatus(
    input: AtualizarStatusPedidoInput
  ): Promise<Pedido> {
    const pedido =
      await this.repository.buscarPorId(
        input.pedidoId
      );

    if (!pedido) {
      throw new Error(
        "Pedido não encontrado."
      );
    }

    const atualizado: Pedido = {
      ...pedido,

      statusOperacional:
        input.status,

      atualizadoEm:
        new Date().toISOString(),
    };

    return this.repository.atualizar(
      atualizado
    );
  }

  async cancelarPedido(
    pedidoId: string
  ): Promise<Pedido> {
    return this.atualizarStatus({
      pedidoId,

      status:
        "CANCELADO",
    });
  }
}

let service:
  PedidoService | null =
  null;

export function getPedidoService(): PedidoService {
  if (!service) {
    service =
      new PedidoService();
  }

  return service;
}