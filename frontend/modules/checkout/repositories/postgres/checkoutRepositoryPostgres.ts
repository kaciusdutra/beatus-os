import { prisma } from "@/lib/prisma";

import { Prisma } from "@/lib/generated/prisma/client";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type { CheckoutRepositoryPort } from "../checkoutRepositoryPort";

import type { MetodoDoPagamento, StatusDoCheckout } from "../../services/statusDoGateway";

import type { CheckoutSalvo, MudancasDoCheckout, SolicitadoDoCheckout } from "../../types/checkout";

type Linha = {
  id: string;
  status: string;
  solicitado: Prisma.JsonValue;
  subtotal: Prisma.Decimal;
  taxaEntrega: Prisma.Decimal;
  total: Prisma.Decimal;
  gateway: string;
  preferenciaExterna: string | null;
  checkoutUrl: string | null;
  metodo: string | null;
  transacaoExterna: string | null;
  statusExterno: string | null;
  expiraEm: Date;
  pedidoId: string | null;
  erro: string | null;
  criadoEm: Date;
};

function mapear(linha: Linha): CheckoutSalvo {
  return {
    id: linha.id,
    status: linha.status as StatusDoCheckout,
    solicitado: linha.solicitado as unknown as SolicitadoDoCheckout,
    subtotal: Number(linha.subtotal),
    taxaEntrega: Number(linha.taxaEntrega),
    total: Number(linha.total),
    gateway: linha.gateway,
    preferenciaExterna: linha.preferenciaExterna ?? undefined,
    checkoutUrl: linha.checkoutUrl ?? undefined,
    metodo: (linha.metodo as MetodoDoPagamento | null) ?? undefined,
    transacaoExterna: linha.transacaoExterna ?? undefined,
    statusExterno: linha.statusExterno ?? undefined,
    expiraEm: linha.expiraEm,
    pedidoId: linha.pedidoId ?? undefined,
    erro: linha.erro ?? undefined,
    criadoEm: linha.criadoEm,
  };
}

// Se um processamento ficou "PROCESSANDO" e o servidor caiu no meio, depois deste
// tempo ele pode ser tentado de novo.
const MINUTOS_PARA_RETOMAR = 5;

export function criarCheckoutRepositoryPostgres(contexto: EmpresaContext): CheckoutRepositoryPort {
  const empresaId = contexto.empresaId;

  return {
    async criar(novo) {
      const criado = await prisma.checkoutSite.create({
        data: {
          id: novo.id,
          empresaId,
          status: "PENDENTE",
          solicitado: novo.solicitado as unknown as Prisma.InputJsonValue,
          subtotal: novo.subtotal,
          taxaEntrega: novo.taxaEntrega,
          total: novo.total,
          gateway: novo.gateway,
          expiraEm: novo.expiraEm,
        },
      });

      return mapear(criado);
    },

    async buscar(id) {
      const linha = await prisma.checkoutSite.findFirst({ where: { id, empresaId } });

      return linha ? mapear(linha) : null;
    },

    async atualizar(id, mudancas: MudancasDoCheckout) {
      const atualizado = await prisma.checkoutSite.update({
        where: { id },
        data: {
          ...(mudancas.status !== undefined ? { status: mudancas.status } : {}),
          ...(mudancas.preferenciaExterna !== undefined ? { preferenciaExterna: mudancas.preferenciaExterna } : {}),
          ...(mudancas.checkoutUrl !== undefined ? { checkoutUrl: mudancas.checkoutUrl } : {}),
          ...(mudancas.metodo !== undefined ? { metodo: mudancas.metodo } : {}),
          ...(mudancas.transacaoExterna !== undefined ? { transacaoExterna: mudancas.transacaoExterna } : {}),
          ...(mudancas.statusExterno !== undefined ? { statusExterno: mudancas.statusExterno } : {}),
          ...(mudancas.erro !== undefined ? { erro: mudancas.erro } : {}),
          ...(mudancas.pedidoId !== undefined ? { pedidoId: mudancas.pedidoId } : {}),
        },
      });

      return mapear(atualizado);
    },

    async reservarParaProcessar(id) {
      const limite = new Date(Date.now() - MINUTOS_PARA_RETOMAR * 60_000);

      const resultado = await prisma.checkoutSite.updateMany({
        where: {
          id,
          empresaId,
          OR: [{ status: { notIn: ["APROVADO", "PROCESSANDO"] } }, { status: "PROCESSANDO", atualizadoEm: { lt: limite } }],
        },
        data: { status: "PROCESSANDO" },
      });

      return resultado.count === 1;
    },

    async expirarVencidos(agora) {
      const resultado = await prisma.checkoutSite.updateMany({
        where: { empresaId, status: { in: ["PENDENTE", "RECUSADO"] }, expiraEm: { lt: agora } },
        data: { status: "EXPIRADO" },
      });

      return resultado.count;
    },

    async registrarEvento(evento) {
      try {
        await prisma.eventoPagamento.create({
          data: {
            empresaId,
            gateway: evento.gateway,
            eventoId: evento.eventoId,
            transacaoExterna: evento.transacaoExterna ?? null,
            tipo: evento.tipo,
            payload: (evento.payload ?? {}) as Prisma.InputJsonValue,
          },
        });

        return { jaProcessado: false };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const existente = await prisma.eventoPagamento.findFirst({ where: { empresaId, gateway: evento.gateway, eventoId: evento.eventoId } });

          return { jaProcessado: existente?.status === "PROCESSADO" };
        }

        throw error;
      }
    },

    async concluirEvento(gateway, eventoId, status, erro) {
      await prisma.eventoPagamento.updateMany({
        where: { empresaId, gateway, eventoId },
        data: { status, erro: erro ?? null, processadoEm: new Date() },
      });
    },

    async registrarPagamentoOnline(dados) {
      await prisma.pagamentoOnline.upsert({
        where: { pagamentoId: dados.pagamentoId },
        create: {
          pagamentoId: dados.pagamentoId,
          gateway: dados.gateway,
          metodo: dados.metodo,
          transacaoExterna: dados.transacaoExterna,
          statusExterno: dados.statusExterno,
        },
        update: { metodo: dados.metodo, transacaoExterna: dados.transacaoExterna, statusExterno: dados.statusExterno },
      });
    },
  };
}
