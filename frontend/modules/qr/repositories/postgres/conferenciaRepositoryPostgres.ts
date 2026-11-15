import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import type { ConferenciaRepositoryPort } from "../conferenciaRepositoryPort";

import type { ConferenciaDoItem } from "../../types/qr";

const ACAO = "CONFERENCIA";

// A conferência mora no Registro de atividades (área Estoque), sem tabela nova.
export function criarConferenciaRepositoryPostgres(contexto: EmpresaContext): ConferenciaRepositoryPort {
  return {
    async registrar({ itemTipo, itemId, nome, operador }) {
      await registrarAtividade(prisma, {
        entidade: "ESTOQUE",
        acao: ACAO,
        resumo: `Conferido pelo QR: ${nome}`,
        referenciaId: itemId,
        operador,
        detalhes: { itemTipo, nome },
      });
    },

    async desde(inicio: Date): Promise<ConferenciaDoItem[]> {
      const linhas = await prisma.registroAtividade.findMany({
        where: {
          empresaId: contexto.empresaId,
          entidade: "ESTOQUE",
          acao: ACAO,
          criadoEm: { gte: inicio },
        },
        orderBy: { criadoEm: "desc" },
        take: 500,
      });

      return linhas.flatMap((linha) => {
        const detalhes = (linha.detalhes ?? {}) as Record<string, unknown>;

        if (!linha.referenciaId) {
          return [];
        }

        return [
          {
            itemTipo: typeof detalhes.itemTipo === "string" ? detalhes.itemTipo : "",
            itemId: linha.referenciaId,
            nome: typeof detalhes.nome === "string" ? detalhes.nome : "",
            em: linha.criadoEm.toISOString(),
            por: linha.operador ?? undefined,
          },
        ];
      });
    },
  };
}
