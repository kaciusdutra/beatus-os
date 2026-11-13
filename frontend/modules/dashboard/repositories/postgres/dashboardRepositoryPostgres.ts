import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type { DashboardRepositoryPort } from "../dashboardRepositoryPort";

import type { PedidoParaDashboard } from "../../types/dashboard";

export class DashboardRepositoryPostgres implements DashboardRepositoryPort {
  constructor(private readonly contexto: EmpresaContext) {}

  async listarPedidos(de: Date, ate: Date): Promise<PedidoParaDashboard[]> {
    const pedidos = await prisma.pedido.findMany({
      where: {
        empresaId: this.contexto.empresaId,
        criadoEm: { gte: de, lt: ate },
      },
      select: {
        statusOperacional: true,
        canal: true,
        total: true,
        criadoEm: true,
        itens: {
          select: { produtoId: true, nome: true, quantidade: true, subtotal: true },
        },
      },
    });

    return pedidos.map((pedido) => ({
      status: pedido.statusOperacional,
      canal: pedido.canal,
      total: Number(pedido.total),
      criadoEm: pedido.criadoEm.toISOString(),
      itens: pedido.itens.map((item) => ({
        produtoId: item.produtoId ?? undefined,
        nome: item.nome,
        quantidade: item.quantidade,
        subtotal: Number(item.subtotal),
      })),
    }));
  }

  async listarEmOperacao(): Promise<{ status: string; criadoEm: string }[]> {
    const pedidos = await prisma.pedido.findMany({
      where: {
        empresaId: this.contexto.empresaId,
        statusOperacional: { in: ["NOVO", "EM_PREPARO", "PRONTO", "EM_ROTA"] },
      },
      select: { statusOperacional: true, criadoEm: true },
    });

    return pedidos.map((pedido) => ({
      status: pedido.statusOperacional,
      criadoEm: pedido.criadoEm.toISOString(),
    }));
  }
}

export function criarDashboardRepositoryPostgres(
  contexto: EmpresaContext
): DashboardRepositoryPort {
  return new DashboardRepositoryPostgres(contexto);
}
