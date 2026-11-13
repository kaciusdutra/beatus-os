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
  registrarAtividade,
} from "@/modules/atividades/services/server/atividadeService";

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

  // Quem lançou (o operador escolhido no topo da tela).
  operador?: string | null;
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

const CANAIS_MARKETPLACE = ["IFOOD", "99FOOD", "KEETA"];

const ROTULO_DO_CANAL: Record<string, string> = {
  IFOOD: "iFood",
  "99FOOD": "99Food",
  KEETA: "Keeta",
};

const ENDERECO_VAZIO = {
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
};

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

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
        return await this.executarUmaVez(input.pedido, input.operador);
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
    solicitado: PedidoSolicitado,
    operador?: string | null
  ): Promise<LancarPedidoPostgresResult> {
    const empresaId =
      this.contexto.empresaId;

    return prisma.$transaction(
      async (tx) => {
        const ehMarketplace = CANAIS_MARKETPLACE.includes(solicitado.canal);

        const codigoExterno = solicitado.marketplace?.codigo?.trim();

        if (ehMarketplace && !codigoExterno) {
          throw new ErroDePedido("Informe o código do pedido no marketplace.");
        }

        if (!ehMarketplace && solicitado.marketplace) {
          throw new ErroDePedido(
            "Os dados de marketplace só valem para pedidos do iFood, 99Food ou Keeta."
          );
        }

        // Pedido de marketplace usa o cliente fixo do canal (criado na primeira vez);
        // os demais exigem um cliente cadastrado.
        let cliente;

        if (ehMarketplace) {
          const jaExisteCodigo = await tx.pedido.findFirst({
            where: { empresaId, canal: solicitado.canal, codigoExterno },
            select: { numero: true },
          });

          if (jaExisteCodigo) {
            throw new ErroDePedido(
              `Já existe um pedido do ${ROTULO_DO_CANAL[solicitado.canal]} com o código ${codigoExterno} (pedido ${jaExisteCodigo.numero}).`
            );
          }

          const chave = `MKT-${solicitado.canal}`;

          cliente =
            (await tx.cliente.findFirst({ where: { empresaId, cpf: chave } })) ??
            (await tx.cliente.create({
              data: {
                empresaId,
                nome: `Cliente ${ROTULO_DO_CANAL[solicitado.canal]}`,
                telefone: chave,
                cpf: chave,
                origemPrimeiroPedido: solicitado.canal,
              },
            }));
        } else {
          cliente = await tx.cliente.findFirst({
            where: {
              id: solicitado.clienteId ?? "",

              empresaId,

              ativo: true,
            },
          });
        }

        if (!cliente) {
          throw new Error(
            "Cliente não encontrado."
          );
        }

        // No marketplace o pagamento já vem aprovado pela plataforma.
        const pagamentoSolicitado = ehMarketplace
          ? {
              modalidade: "ELETRONICO" as const,
              forma: solicitado.canal === "IFOOD" ? ("IFOOD" as const) : solicitado.canal === "99FOOD" ? ("99FOOD" as const) : ("KEETA" as const),
              status: "APROVADO" as const,
            }
          : solicitado.pagamento;

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
              ehMarketplace ? null : solicitado.distanciaEntregaKm,

            semEntrega:
              ehMarketplace,

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
            codigoExterno ?? solicitado.identificadorExterno,

          cliente: {
            clienteId:
              cliente.id,

            nome:
              cliente.nome,

            telefone:
              cliente.telefone,
          },

          enderecoEntrega:
            solicitado.enderecoEntrega ?? ENDERECO_VAZIO,

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
              pagamentoSolicitado.modalidade,

            forma:
              pagamentoSolicitado.forma,

            status:
              pagamentoSolicitado.status,

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
              pagamentoSolicitado.status ===
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
        // aprovado (pagar na entrega só quando a fidelização existir).
        if (!podeEntrarNaOperacao(pedido)) {
          throw new ErroDePedido(
            "O pedido só entra na operação com o pagamento aprovado. Pagar na entrega não está liberado: é um benefício da fidelização."
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

        // Marketplace: guarda o código, a entrega da plataforma e o que ela deve
        // repassar (total menos a comissão do canal), aguardando conferência.
        let complementoDoResumo = "";

        if (ehMarketplace) {
          const canalDePreco = await tx.canalPrecificacao.findFirst({
            where: { empresaId, canal: solicitado.canal },
          });

          const comissao = arredondar(
            (pedido.total * Number(canalDePreco?.comissaoPercentual ?? 0)) / 100
          );

          await tx.pedido.update({
            where: { id: pedidoCriado.id },
            data: {
              codigoExterno,
              nomeClienteExterno: solicitado.marketplace?.nomeCliente?.trim() || null,
              entregaPor: "MARKETPLACE",
              comissaoEsperada: comissao,
              liquidoEsperado: arredondar(pedido.total - comissao),
              conferenciaStatus: "AGUARDANDO",
              distanciaEntregaKm: null,
              enderecoLogradouro: null,
              enderecoNumero: null,
              enderecoBairro: null,
              enderecoCidade: null,
              enderecoEstado: null,
            },
          });

          complementoDoResumo = ` Código ${codigoExterno} no ${ROTULO_DO_CANAL[solicitado.canal]}; repasse esperado R$ ${arredondar(pedido.total - comissao).toFixed(2).replace(".", ",")}.`;
        }

        // O pedido entrou na fila da cozinha: gera o ticket e registra.
        await tx.filaImpressao.create({
          data: {
            empresaId,
            pedidoId: pedidoCriado.id,
            tipo: "TICKET_COZINHA",
          },
        });

        await registrarAtividade(tx, {
          entidade: "PEDIDO",
          acao: "LANCADO",
          resumo: `Pedido ${pedidoCriado.numero} lançado (${pedido.canal}): ${pedido.itens.length} item(ns), R$ ${pedido.total.toFixed(2)}.${complementoDoResumo}`,
          referenciaId: pedidoCriado.id,
          referenciaNumero: String(pedidoCriado.numero),
          operador,
        });

        // O cliente fixo do canal não acumula histórico de compras.
        if (ehMarketplace) {
          return {
            pedido: pedidoCriado,

            pagamento: pagamentoCriado,
          };
        }

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
