import {
  Prisma,
} from "@/lib/generated/prisma/client";

import {
  Pedido,
} from "../../types/pedido";

function decimalParaNumero(
  valor: Prisma.Decimal
): number {
  return Number(valor);
}

export class PedidoRepositoryPostgres {
  async criar(
    db: Prisma.TransactionClient,
    empresaId: string,
    pedido: Pedido,
  ) {
    const clienteId =
      pedido.cliente.clienteId;

    const endereco =
      pedido.enderecoEntrega;

    const criado =
      await db.pedido.create({
        data: {
          id:
            pedido.id,

          empresaId,

          clienteId,

          numero:
              String(
              pedido.numero
         ),

          canal:
            pedido.canal,

          entrada:
            pedido.entrada,

          subtotal:
            pedido.subtotal,

          descontos:
            pedido.descontos,

          taxaEntrega:
            pedido.taxaEntrega,

          total:
            pedido.total,

          distanciaEntregaKm:
            pedido.distanciaEntregaKm,

          regraEntregaAplicada:
            pedido.regraEntregaAplicada ??
            null,

          statusOperacional:
            pedido.statusOperacional,

          enderecoEntregaId:
            endereco?.enderecoId ??
            null,

          enderecoRotulo:
            endereco?.rotulo ??
            null,

          enderecoCep:
            endereco?.cep ??
            null,

          enderecoLogradouro:
            endereco?.logradouro ??
            null,

          enderecoNumero:
            endereco?.numero ??
            null,

          enderecoComplemento:
            endereco?.complemento ??
            null,

          enderecoBairro:
            endereco?.bairro ??
            null,

          enderecoCidade:
            endereco?.cidade ??
            null,

          enderecoEstado:
            endereco?.estado ??
            null,

          enderecoLatitude:
            endereco?.latitude ??
            null,

          enderecoLongitude:
            endereco?.longitude ??
            null,

          criadoEm:
            new Date(
              pedido.criadoEm
            ),

          atualizadoEm:
            new Date(
              pedido.atualizadoEm
            ),

          itens: {
            create:
              pedido.itens.flatMap(
                (item) => {
                  const adicionais =
                    item.adicionais ?? [];

                  const subtotalAdicionais =
                    adicionais.reduce(
                      (soma, adicional) =>
                        soma +
                        adicional.subtotal,
                      0
                    );

                  // O adicional é um produto com preço próprio: vira uma
                  // linha do pedido, e o item fica só com o seu valor.
                  return [
                    {
                      id:
                        crypto.randomUUID(),

                      // Item da plataforma ainda sem produto ligado fica sem produto.
                      produtoId:
                        item.produtoId ||
                        null,

                      nome:
                        item.nome,

                      quantidade:
                        item.quantidade,

                      precoUnitario:
                        item.precoUnitario,

                      subtotal:
                        Math.round(
                          (item.subtotal -
                            subtotalAdicionais) *
                            100
                        ) / 100,

                      observacao:
                        item.observacao ??
                        null,
                    },

                    ...adicionais.map(
                      (adicional) => ({
                        id:
                          crypto.randomUUID(),

                        produtoId:
                          adicional.id,

                        nome:
                          `+ ${adicional.nome}`,

                        quantidade:
                          adicional.quantidade,

                        precoUnitario:
                          adicional.precoUnitario,

                        subtotal:
                          adicional.subtotal,

                        observacao:
                          null,
                      })
                    ),
                  ];
                }
              ),
          },
        },

        include: {
          itens: true,
        },
      });

    return {
      id:
        criado.id,

      numero:
        criado.numero,

      total:
        decimalParaNumero(
          criado.total
        ),

      statusOperacional:
        criado.statusOperacional,
    };
  }
}