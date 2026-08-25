import {
  Pedido,
} from "../types/pedido";

import {
  Cliente,
} from "@/modules/clientes/types/cliente";

import {
  getPedidoService,
} from "./pedidoService";

import {
  getClienteService,
} from "@/modules/clientes/services/clienteService";

import {
  getPedidoRepository,
} from "../repositories/pedidoRepository";

import {
  getClienteRepository,
} from "@/modules/clientes/repositories/clienteRepository";

import {
  getTransactionManager,
} from "@/core/persistence/Transaction";

export interface LancarPedidoInput {
  pedido: Pedido;

  cliente: Cliente;
}

export interface LancarPedidoResult {
  pedido: Pedido;

  cliente: Cliente;
}

export class LancarPedidoService {
  private readonly pedidoService =
    getPedidoService();

  private readonly clienteService =
    getClienteService();

  private readonly pedidoRepository =
    getPedidoRepository();

  private readonly clienteRepository =
    getClienteRepository();

  private readonly transactionManager =
    getTransactionManager();

  async executar(
    input: LancarPedidoInput
  ): Promise<LancarPedidoResult> {
    const clienteExistente =
      await this.clienteService.buscarPorId(
        input.cliente.id
      );

    if (!clienteExistente) {
      throw new Error(
        "Cliente não encontrado."
      );
    }

    const pedidoExistente =
      await this.pedidoService.buscarPorId(
        input.pedido.id
      );

    if (pedidoExistente) {
      throw new Error(
        "Este pedido já foi lançado."
      );
    }

    return this.transactionManager.executar(
      [
        this.pedidoRepository,
        this.clienteRepository,
      ],
      async () => {
        const pedido =
          await this.pedidoService.criarPedido(
            input.pedido
          );

        const cliente =
          await this.clienteService.registrarCompra({
            clienteId:
              input.cliente.id,

            valorCompra:
              pedido.total,

            dataCompra:
              pedido.criadoEm,
          });

        return {
          pedido,
          cliente,
        };
      }
    );
  }
}

let service:
  LancarPedidoService | null =
  null;

export function getLancarPedidoService(): LancarPedidoService {
  if (!service) {
    service =
      new LancarPedidoService();
  }

  return service;
}