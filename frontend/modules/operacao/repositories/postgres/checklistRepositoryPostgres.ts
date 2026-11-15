import "server-only";

import { prisma } from "@/lib/prisma";

import { Prisma } from "@/lib/generated/prisma/client";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type {
  ChecklistRepositoryPort,
  ExecucaoSalva,
  ItemDoModeloSalvo,
} from "../checklistRepositoryPort";

import type { ItemDoModelo, TipoDeChecklist } from "../../services/checklist";

// Datas em colunas DATE: gravadas e lidas em UTC, para o dia nunca virar por fuso.
function paraData(texto: string): Date {
  return new Date(`${texto}T00:00:00.000Z`);
}

type LinhaDeExecucao = {
  id: string;
  data: Date;
  tipo: string;
  concluidoEm: Date | null;
  concluidoPor: string | null;
  itens: {
    id: string;
    titulo: string;
    categoria: string | null;
    obrigatorio: boolean;
    ordem: number;
    verificacao: string | null;
    feito: boolean;
    feitoPor: string | null;
    feitoEm: Date | null;
    observacao: string | null;
  }[];
};

function mapearExecucao(linha: LinhaDeExecucao): ExecucaoSalva {
  return {
    id: linha.id,
    data: linha.data.toISOString().slice(0, 10),
    tipo: linha.tipo as TipoDeChecklist,
    concluidoEm: linha.concluidoEm?.toISOString(),
    concluidoPor: linha.concluidoPor ?? undefined,
    itens: [...linha.itens]
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        id: item.id,
        titulo: item.titulo,
        categoria: item.categoria ?? undefined,
        obrigatorio: item.obrigatorio,
        ordem: item.ordem,
        verificacao: item.verificacao ?? undefined,
        feito: item.feito,
        feitoPor: item.feitoPor ?? undefined,
        feitoEm: item.feitoEm?.toISOString(),
        observacao: item.observacao ?? undefined,
      })),
  };
}

export class ChecklistRepositoryPostgres implements ChecklistRepositoryPort {
  constructor(private readonly contexto: EmpresaContext) {}

  private get empresaId(): string {
    return this.contexto.empresaId;
  }

  async listarModelo(tipo: TipoDeChecklist): Promise<ItemDoModeloSalvo[]> {
    const linhas = await prisma.checklistItemModelo.findMany({
      where: { empresaId: this.empresaId, tipo },
      orderBy: { ordem: "asc" },
    });

    return linhas.map((linha) => ({
      id: linha.id,
      titulo: linha.titulo,
      categoria: linha.categoria ?? undefined,
      obrigatorio: linha.obrigatorio,
      verificacao: linha.verificacao ?? undefined,
    }));
  }

  async semearModeloSeVazio(padrao: Record<TipoDeChecklist, ItemDoModelo[]>): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Duas telas abrindo juntas liam "vazio" ao mesmo tempo e semeavam duas vezes.
      // O bloqueio faz a segunda esperar e já encontrar a lista pronta.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"checklist-modelo:" + this.empresaId}))`;

      const existentes = await tx.checklistItemModelo.count({ where: { empresaId: this.empresaId } });

      if (existentes > 0) {
        return;
      }

      for (const tipo of Object.keys(padrao) as TipoDeChecklist[]) {
        await tx.checklistItemModelo.createMany({
          data: padrao[tipo].map((item, ordem) => ({
            empresaId: this.empresaId,
            tipo,
            titulo: item.titulo,
            categoria: item.categoria ?? null,
            obrigatorio: item.obrigatorio,
            ordem,
            verificacao: item.verificacao ?? null,
          })),
        });
      }
    });
  }

  async substituirModelo(tipo: TipoDeChecklist, itens: ItemDoModelo[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.checklistItemModelo.deleteMany({ where: { empresaId: this.empresaId, tipo } });

      await tx.checklistItemModelo.createMany({
        data: itens.map((item, ordem) => ({
          empresaId: this.empresaId,
          tipo,
          titulo: item.titulo.trim(),
          categoria: item.categoria?.trim() || null,
          obrigatorio: item.obrigatorio,
          ordem,
          verificacao: item.verificacao || null,
        })),
      });
    });
  }

  private async buscar(onde: Prisma.ChecklistExecucaoWhereInput): Promise<ExecucaoSalva | null> {
    const linha = await prisma.checklistExecucao.findFirst({
      where: { empresaId: this.empresaId, ...onde },
      include: { itens: true },
    });

    return linha ? mapearExecucao(linha) : null;
  }

  async buscarExecucao(data: string, tipo: TipoDeChecklist): Promise<ExecucaoSalva | null> {
    return this.buscar({ data: paraData(data), tipo });
  }

  async buscarExecucaoDoItem(itemId: string): Promise<ExecucaoSalva | null> {
    return this.buscar({ itens: { some: { id: itemId } } });
  }

  async buscarExecucaoPorId(id: string): Promise<ExecucaoSalva | null> {
    return this.buscar({ id });
  }

  async criarExecucao(
    data: string,
    tipo: TipoDeChecklist,
    itens: ItemDoModelo[]
  ): Promise<ExecucaoSalva> {
    try {
      const criada = await prisma.checklistExecucao.create({
        data: {
          empresaId: this.empresaId,
          data: paraData(data),
          tipo,
          itens: {
            create: itens.map((item, ordem) => ({
              modeloItemId: item.id ?? null,
              titulo: item.titulo,
              categoria: item.categoria ?? null,
              obrigatorio: item.obrigatorio,
              ordem,
              verificacao: item.verificacao ?? null,
            })),
          },
        },
        include: { itens: true },
      });

      return mapearExecucao(criada);
    } catch (error) {
      // Duas telas abriram o mesmo checklist ao mesmo tempo: fica o que já existe.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existente = await this.buscarExecucao(data, tipo);

        if (existente) {
          return existente;
        }
      }

      throw error;
    }
  }

  async marcarItem(
    itemId: string,
    dados: { feito: boolean; observacao?: string; operador?: string | null }
  ): Promise<void> {
    await prisma.checklistExecucaoItem.update({
      where: { id: itemId },
      data: {
        feito: dados.feito,
        feitoPor: dados.feito ? (dados.operador?.trim() || null) : null,
        feitoEm: dados.feito ? new Date() : null,
        observacao: dados.observacao?.trim() || null,
      },
    });
  }

  async concluir(execucaoId: string, operador?: string | null): Promise<void> {
    await prisma.checklistExecucao.update({
      where: { id: execucaoId },
      data: { concluidoEm: new Date(), concluidoPor: operador?.trim() || null },
    });
  }

  async reabrir(execucaoId: string): Promise<void> {
    await prisma.checklistExecucao.update({
      where: { id: execucaoId },
      data: { concluidoEm: null, concluidoPor: null },
    });
  }

  async listarExecucoesDoDia(data: string): Promise<ExecucaoSalva[]> {
    const linhas = await prisma.checklistExecucao.findMany({
      where: { empresaId: this.empresaId, data: paraData(data) },
      include: { itens: true },
    });

    return linhas.map(mapearExecucao);
  }
}

export function criarChecklistRepositoryPostgres(contexto: EmpresaContext): ChecklistRepositoryPort {
  return new ChecklistRepositoryPostgres(contexto);
}
