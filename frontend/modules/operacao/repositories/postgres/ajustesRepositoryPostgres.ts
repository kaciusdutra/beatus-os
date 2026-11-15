import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type { AjustesRepositoryPort, NovaLinhaDeAjuste } from "../ajustesRepositoryPort";

import { ACAO_AJUSTE, ACAO_AJUSTE_RESOLVIDO, type LinhaDeAjuste } from "../../services/ajustes";

// Quantos registros se leem de uma vez; ajuste esquecido por mais que isso some da lista.
const LIMITE = 500;

export function criarAjustesRepositoryPostgres(contexto: EmpresaContext): AjustesRepositoryPort {
  return {
    async listarLinhas(): Promise<LinhaDeAjuste[]> {
      const linhas = await prisma.registroAtividade.findMany({
        where: {
          empresaId: contexto.empresaId,
          entidade: "OPERACAO",
          acao: { in: [ACAO_AJUSTE, ACAO_AJUSTE_RESOLVIDO] },
        },
        orderBy: { criadoEm: "desc" },
        take: LIMITE,
      });

      return linhas.map((linha) => ({
        id: linha.id,
        acao: linha.acao,
        referenciaId: linha.referenciaId ?? undefined,
        operador: linha.operador ?? undefined,
        criadoEm: linha.criadoEm.toISOString(),
        detalhes: linha.detalhes ?? undefined,
      }));
    },

    async gravar(linha: NovaLinhaDeAjuste): Promise<string> {
      const criada = await prisma.registroAtividade.create({
        data: {
          empresaId: contexto.empresaId,
          entidade: "OPERACAO",
          acao: linha.acao,
          resumo: linha.resumo,
          referenciaId: linha.referenciaId ?? null,
          operador: linha.operador?.trim() || null,
          // JSON puro: some o que veio sem valor.
          detalhes: linha.detalhes ? JSON.parse(JSON.stringify(linha.detalhes)) : undefined,
        },
      });

      return criada.id;
    },
  };
}
