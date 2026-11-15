import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type { HorarioRepositoryPort } from "../horarioRepositoryPort";

import {
  configuracaoPadrao,
  type ConfiguracaoDeHorarios,
  type ExcecaoDeHorario,
  type HorarioSemanal,
} from "../../services/horarios";

// Datas de exceção ficam em colunas DATE: gravadas e lidas em UTC, para o dia
// nunca virar por fuso.
function paraTexto(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function paraData(texto: string): Date {
  return new Date(`${texto}T00:00:00.000Z`);
}

function mapearExcecao(linha: {
  id: string;
  inicio: Date;
  fim: Date;
  aberto: boolean;
  abertura: string | null;
  fechamento: string | null;
  observacao: string | null;
}): ExcecaoDeHorario {
  return {
    id: linha.id,
    inicio: paraTexto(linha.inicio),
    fim: paraTexto(linha.fim),
    aberto: linha.aberto,
    abertura: linha.abertura ?? undefined,
    fechamento: linha.fechamento ?? undefined,
    observacao: linha.observacao ?? undefined,
  };
}

export class HorarioRepositoryPostgres implements HorarioRepositoryPort {
  constructor(private readonly contexto: EmpresaContext) {}

  async carregar(): Promise<ConfiguracaoDeHorarios> {
    const [dias, excecoes] = await Promise.all([
      prisma.horarioDeFuncionamento.findMany({ where: { empresaId: this.contexto.empresaId } }),
      prisma.excecaoDeHorario.findMany({
        where: { empresaId: this.contexto.empresaId },
        orderBy: [{ inicio: "asc" }, { fim: "asc" }],
      }),
    ]);

    const configuracao = configuracaoPadrao();

    for (const dia of dias) {
      configuracao.semanal[dia.diaDaSemana] = {
        aberto: dia.aberto,
        abertura: dia.aberto ? (dia.abertura ?? undefined) : undefined,
        fechamento: dia.aberto ? (dia.fechamento ?? undefined) : undefined,
      };
    }

    configuracao.excecoes = excecoes.map(mapearExcecao);

    return configuracao;
  }

  async salvarSemana(semanal: HorarioSemanal): Promise<void> {
    await prisma.$transaction(
      semanal.map((dia, diaDaSemana) =>
        prisma.horarioDeFuncionamento.upsert({
          where: {
            empresaId_diaDaSemana: { empresaId: this.contexto.empresaId, diaDaSemana },
          },
          create: {
            empresaId: this.contexto.empresaId,
            diaDaSemana,
            aberto: dia.aberto,
            abertura: dia.aberto ? (dia.abertura ?? null) : null,
            fechamento: dia.aberto ? (dia.fechamento ?? null) : null,
          },
          update: {
            aberto: dia.aberto,
            abertura: dia.aberto ? (dia.abertura ?? null) : null,
            fechamento: dia.aberto ? (dia.fechamento ?? null) : null,
          },
        })
      )
    );
  }

  async criarExcecao(excecao: Omit<ExcecaoDeHorario, "id">): Promise<ExcecaoDeHorario> {
    const criada = await prisma.excecaoDeHorario.create({
      data: {
        empresaId: this.contexto.empresaId,
        inicio: paraData(excecao.inicio),
        fim: paraData(excecao.fim),
        aberto: excecao.aberto,
        abertura: excecao.aberto ? (excecao.abertura ?? null) : null,
        fechamento: excecao.aberto ? (excecao.fechamento ?? null) : null,
        observacao: excecao.observacao ?? null,
      },
    });

    return mapearExcecao(criada);
  }

  async removerExcecao(id: string): Promise<ExcecaoDeHorario | null> {
    const existente = await prisma.excecaoDeHorario.findFirst({
      where: { id, empresaId: this.contexto.empresaId },
    });

    if (!existente) {
      return null;
    }

    await prisma.excecaoDeHorario.delete({ where: { id } });

    return mapearExcecao(existente);
  }
}

export function criarHorarioRepositoryPostgres(contexto: EmpresaContext): HorarioRepositoryPort {
  return new HorarioRepositoryPostgres(contexto);
}
