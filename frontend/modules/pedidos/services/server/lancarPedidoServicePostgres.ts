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
  podeEntrarNaOperacao,
} from "@/core/payment/paymentRules";

import {
  Pedido,
} from "../../types/pedido";

import type {
  PedidoSolicitado,
} from "../../types/pedidoSolicitado";

import {
  PedidoRepositoryPostgres,
} from "../../repositories/postgres/pedidoRepositoryPostgres";

import {
  PagamentoRepositoryPostgres,
} from "../../repositories/postgres/pagamentoRepositoryPostgres";

import {
  ErroDePedido,
  calcularPedidoNoServidor,
} from "../calcularPedido";

export interface LancarPedidoPostgresInput {
  pedido: PedidoSolicitado;
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

const TENTATIVAS_DO_NUMERO = 6;

function ehConflitoDeNumero(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  );
}

export class LancarPedidoServicePostgres {
  private readonly contexto =
    criarContextoDesenvolvimento();

  private readonly pedidoRepository =
    new PedidoRepositoryPostgres();

  private readonly pagamentoRepository =
    new PagamentoRepositoryPostgres();

  // Duas criações ao mesmo tempo podem disputar o mesmo número: o banco
  // recusa a segunda (número único por empresa ou conflito de transação) e
  // ela tenta de novo com o próximo número livre.
  async executar(
    input: LancarPedidoPostgresInput
  ): Promise<LancarPedidoPostgresResult> {
    let ultimoErro: unknown;

    for (
      let tentativa = 0;
      tentativa < TENTATIVAS_DO_NUMERO;
      tentativa++
    ) {
      try {
        return await this.executarUmaVez(input.pedido);
      } catch (error) {
        if (!ehConflitoDeNumero(error)) {
          throw error;
        }

        ultimoErro = error;
      }
    }

    throw ultimoErro;
  }

  private async executarUmaVez(
    solicitado: PedidoSolicitado
  ): Promise<LancarPedidoPostgresResult> {
    const empresaId =
      this.contexto.empresaId;

    return prisma.$transaction(
      async (tx) => {
        const cliente =
          await tx.cliente.findFirst({
            where: {
              id:
                solicitado.clienteId,

              empresaId,

              ativo:
                true,
            },
          });

        if (!cliente) {
          throw new Error(
            "Cliente não encontrado."
          );
        }

        if (solicitado.id) {
          const jaExiste =
            await tx.pedido.findFirst({
              where: {
                id:
                  solicitado.id,
              },
            });

          if (jaExiste) {
            throw new Error(
              "Este pedido já foi lançado."
            );
          }
        }

        // Preço, subtotal, taxa de entrega e total vêm do servidor.
        const idsDosProdutos = [
          ...new Set(
            solicitado.itens.flatMap(
              (item) => [
                item.produtoId,
                ...(item.adicionais ?? []).map(
                  (adicional) =>
                    adicional.produtoId
                ),
              ]
            )
          ),
        ];

        const [produtos, precos] =
          await Promise.all([
            tx.produto.findMany({
              where: {
                empresaId,

                id: {
                  in:
                    idsDosProdutos,
                },
              },
            }),

            tx.precoProduto.findMany({
              where: {
                empresaId,

                produtoId: {
                  in:
                    idsDosProdutos,
                },
              },
            }),
          ]);

        const calculado =
          calcularPedidoNoServidor({
            canal:
              solicitado.canal,

            itens:
              solicitado.itens,

            distanciaEntregaKm:
              solicitado.distanciaEntregaKm,

            produtos:
              produtos.map(
                (produto) => ({
                  id:
                    produto.id,

                  nome:
                    produto.nome,

                  categoria:
                    produto.categoria,

                  ativo:
                    produto.ativo,
                })
              ),

            precos:
              precos.map(
                (preco) => ({
                  produtoId:
                    preco.produtoId,

                  canal:
                    preco.canal,

                  preco:
                    Number(
                      preco.preco
                    ),
                })
              ),
          });

        const ultimo =
          await tx.$queryRaw<
            { max: number | null }[]
          >`SELECT MAX(CAST("numero" AS INTEGER)) AS "max" FROM "Pedido" WHERE "empresaId" = ${empresaId} AND "numero" ~ '^[0-9]{1,9}$'`;

        const numero =
          (ultimo[0]?.max ?? 0) +
          1;

        const agora =
          new Date().toISOString();

        const entrada =
          solicitado.entrada;

        const pedido:
          Pedido = {
          id:
            solicitado.id ??
            crypto.randomUUID(),

          numero,

          canal:
            solicitado.canal,

          entrada,

          identificadorExterno:
            solicitado.identificadorExterno,

          cliente: {
            clienteId:
              cliente.id,

            nome:
              cliente.nome,

            telefone:
              cliente.telefone,
          },

          enderecoEntrega:
            solicitado.enderecoEntrega,

          itens:
            calculado.itens,

          subtotal:
            calculado.subtotal,

          descontos:
            calculado.descontos,

          taxaEntrega:
            calculado.taxaEntrega,

          total:
            calculado.total,

          distanciaEntregaKm:
            calculado.distanciaEntregaKm,

          regraEntregaAplicada:
            calculado.regraEntregaAplicada,

          pagamento: {
            modalidade:
              solicitado.pagamento.modalidade,

            forma:
              solicitado.pagamento.forma,

            status:
              solicitado.pagamento.status,

            origem:
              entrada === "MANUAL"
                ? "PDV_INTERNO"
                : entrada === "API"
                  ? "MARKETPLACE"
                  : "CHECKOUT_ONLINE",

            valor:
              calculado.total,

            cobrancaNoPdvHabilitada:
              entrada === "MANUAL",

            confirmacaoAutomatica:
              entrada !== "MANUAL",

            criadoEm:
              agora,

            aprovadoEm:
              solicitado.pagamento.status ===
              "APROVADO"
                ? agora
                : undefined,
          },

          statusOperacional:
            "NOVO",

          criadoEm:
            agora,

          atualizadoEm:
            agora,
        };

        // Regra de pagamento no servidor: só entra na cozinha com pagamento
        // aprovado ou quando for pagar na entrega.
        if (!podeEntrarNaOperacao(pedido)) {
          throw new ErroDePedido(
            "O pedido só entra na operação com o pagamento aprovado ou para pagar na entrega."
          );
        }

        const pedidoCriado =
          await this.pedidoRepository.criar(
            tx,
            empresaId,
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

        await tx.cliente.update({
          where: {
            id:
              cliente.id,
          },

          data: {
            ticketMedio:
              quantidadePedidos >
              0
                ? valorTotalCompras /
                  quantidadePedidos
                : 0,
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
