import {
  Prisma,
} from "@/lib/generated/prisma/client";

import {
  Pedido,
} from "../../types/pedido";

export class PagamentoRepositoryPostgres {
  async criar(
    db: Prisma.TransactionClient,
    pedidoId: string,
    pagamento: Pedido["pagamento"],
  ) {
    const criado =
      await db.pagamento.create({
        data: {
          id:
            crypto.randomUUID(),

          pedidoId,

          modalidade:
            pagamento.modalidade,

          forma:
            pagamento.forma,

          status:
            pagamento.status,

          origem:
            pagamento.origem,

          valor:
            pagamento.valor,

          cobrancaNoPdvHabilitada:
            pagamento.cobrancaNoPdvHabilitada,

          confirmacaoAutomatica:
            pagamento.confirmacaoAutomatica,

          criadoEm:
            new Date(
              pagamento.criadoEm
            ),

          aprovadoEm:
            pagamento.aprovadoEm
              ? new Date(
                  pagamento.aprovadoEm
                )
              : null,
        },
      });

    return {
      id:
        criado.id,

      pedidoId:
        criado.pedidoId,

      status:
        criado.status,

      valor:
        Number(
          criado.valor
        ),
    };
  }
}