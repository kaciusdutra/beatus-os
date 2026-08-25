import "server-only";

import {
  Prisma,
} from "@/lib/generated/prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  criarContextoDesenvolvimento,
} from "@/core/context/empresaContext";

import {
  Pedido,
} from "../../types/pedido";

import {
  PedidoRepositoryPostgres,
} from "../../repositories/postgres/pedidoRepositoryPostgres";

import {
  PagamentoRepositoryPostgres,
} from "../../repositories/postgres/pagamentoRepositoryPostgres";

export interface LancarPedidoPostgresInput {
  pedido: Pedido;
}

export interface LancarPedidoPostgresResult {
  pedido: {
    id: string;
    numero: string;
    total: number;
    statusOperacional:
      string;
  };

  pagamento: {
    id: string;
    status: string;
    valor: number;
  };
}

export class LancarPedidoServicePostgres {
  private readonly contexto =
    criarContextoDesenvolvimento();

  private readonly pedidoRepository =
    new PedidoRepositoryPostgres();

  private readonly pagamentoRepository =
    new PagamentoRepositoryPostgres();

  async executar(
    input: LancarPedidoPostgresInput
  ): Promise<LancarPedidoPostgresResult> {
    const pedido =
      input.pedido;

    const clienteId =
      pedido.cliente.clienteId;

    const resultado =
      await prisma.$transaction(
        async (tx) => {
          const cliente =
            await tx.cliente.findFirst({
              where: {
                id:
                  clienteId,

                empresaId:
                  this.contexto.empresaId,

                ativo:
                  true,
              },
            });

          if (!cliente) {
            throw new Error(
              "Cliente não encontrado."
            );
          }

          const pedidoExistente =
            await tx.pedido.findFirst({
              where: {
                OR: [
                  {
                    id:
                      pedido.id,
                  },

                  {
                    empresaId:
                      this.contexto
                        .empresaId,

                    numero:
                       String(
                        pedido.numero
                       ),
                  },
                ],
              },
            });

          if (pedidoExistente) {
            throw new Error(
              "Este pedido já foi lançado."
            );
          }

          const pedidoCriado =
            await this.pedidoRepository.criar(
              tx,
              this.contexto.empresaId,
              pedido
            );

          const pagamentoCriado =
            await this.pagamentoRepository.criar(
              tx,
              pedidoCriado.id,
              pedido.pagamento
            );

          const clienteAtualizado =
            await tx.cliente.update({
              where: {
                id:
                  cliente.id,
              },

              data: {
                quantidadePedidos: {
                  increment: 1,
                },

                valorTotalCompras: {
                  increment:
                    pedido.total,
                },

                ultimoPedidoEm:
                  new Date(
                    pedido.criadoEm
                  ),
              },
            });

          const quantidadePedidos =
            clienteAtualizado
              .quantidadePedidos;

          const valorTotalCompras =
            Number(
              clienteAtualizado
                .valorTotalCompras
            );

          const ticketMedio =
            quantidadePedidos >
            0
              ? valorTotalCompras /
                quantidadePedidos
              : 0;

          await tx.cliente.update({
            where: {
              id:
                cliente.id,
            },

            data: {
              ticketMedio,
            },
          });

          return {
            pedido:
              pedidoCriado,

            pagamento:
              pagamentoCriado,
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        }
      );

    return resultado;
  }
}

let service:
  LancarPedidoServicePostgres | null =
  null;

export function getLancarPedidoServicePostgres(): LancarPedidoServicePostgres {
  if (!service) {
    service =
      new LancarPedidoServicePostgres();
  }

  return service;
}