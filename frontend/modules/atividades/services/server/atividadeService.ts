import "server-only";

import { prisma } from "@/lib/prisma";

import type { Prisma } from "@/lib/generated/prisma/client";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

// Registro de atividades: só se acrescenta, nunca se edita nem se apaga.
// Quem chama grava na MESMA transação da ação, então não existe a ação sem
// o registro, nem o registro sem a ação.

type ClienteComRegistro = Pick<Prisma.TransactionClient, "registroAtividade">;

export interface NovaAtividade {
  // PEDIDO, ENTRADA_COMPRA, ESTOQUE, PRODUCAO, PRECO, FINANCEIRO, FICHA...
  entidade: string;

  // LANCADO, EM_PREPARO, CANCELADO, CONFIRMADA, CONTAGEM, PERDA, LOTE...
  acao: string;

  // Texto pronto para ler.
  resumo: string;

  referenciaId?: string;

  referenciaNumero?: string;

  // Quem fez: o operador escolhido no topo da tela (depois, o usuário do login).
  operador?: string | null;

  detalhes?: Prisma.InputJsonValue;
}

export async function registrarAtividade(
  db: ClienteComRegistro,
  dados: NovaAtividade
): Promise<void> {
  const contexto = criarContextoDesenvolvimento();

  await db.registroAtividade.create({
    data: {
      empresaId: contexto.empresaId,
      entidade: dados.entidade,
      acao: dados.acao,
      resumo: dados.resumo,
      referenciaId: dados.referenciaId ?? null,
      referenciaNumero: dados.referenciaNumero ?? null,
      operador: dados.operador?.trim() || null,
      detalhes: dados.detalhes,
    },
  });
}

export interface AtividadeListada {
  id: string;

  entidade: string;

  acao: string;

  resumo: string;

  referenciaId?: string;

  referenciaNumero?: string;

  operador?: string;

  criadoEm: string;
}

export interface FiltroDeAtividades {
  entidade?: string;

  // Número ou id do que se procura (ex.: o número de um pedido).
  referencia?: string;

  // AAAA-MM-DD
  de?: string;

  ate?: string;

  limite?: number;
}

export async function listarAtividades(
  filtro: FiltroDeAtividades = {}
): Promise<AtividadeListada[]> {
  const contexto = criarContextoDesenvolvimento();

  const limite = Math.min(Math.max(filtro.limite ?? 100, 1), 500);

  const linhas = await prisma.registroAtividade.findMany({
    where: {
      empresaId: contexto.empresaId,
      ...(filtro.entidade ? { entidade: filtro.entidade } : {}),
      ...(filtro.referencia
        ? {
            OR: [
              { referenciaNumero: filtro.referencia },
              { referenciaId: filtro.referencia },
            ],
          }
        : {}),
      ...(filtro.de || filtro.ate
        ? {
            criadoEm: {
              ...(filtro.de
                ? { gte: new Date(`${filtro.de}T00:00:00`) }
                : {}),
              ...(filtro.ate
                ? { lte: new Date(`${filtro.ate}T23:59:59.999`) }
                : {}),
            },
          }
        : {}),
    },
    orderBy: { criadoEm: "desc" },
    take: limite,
  });

  return linhas.map((linha) => ({
    id: linha.id,
    entidade: linha.entidade,
    acao: linha.acao,
    resumo: linha.resumo,
    referenciaId: linha.referenciaId ?? undefined,
    referenciaNumero: linha.referenciaNumero ?? undefined,
    operador: linha.operador ?? undefined,
    criadoEm: linha.criadoEm.toISOString(),
  }));
}
