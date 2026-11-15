import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import type {
  PixConfiguracaoRepositoryPort,
  PixSalvo,
} from "../pixConfiguracaoRepositoryPort";

export class PixConfiguracaoRepositoryPostgres implements PixConfiguracaoRepositoryPort {
  constructor(private readonly contexto: EmpresaContext) {}

  async buscar(): Promise<PixSalvo> {
    const linha = await prisma.configuracaoFinanceira.findUnique({
      where: { empresaId: this.contexto.empresaId },
    });

    return {
      chave: linha?.pixChave ?? undefined,
      nomeRecebedor: linha?.pixNomeRecebedor ?? undefined,
      cidade: linha?.pixCidade ?? undefined,
    };
  }

  async salvar(dados: Required<PixSalvo>, operador?: string | null): Promise<PixSalvo> {
    await prisma.$transaction(async (tx) => {
      await tx.configuracaoFinanceira.upsert({
        where: { empresaId: this.contexto.empresaId },
        create: {
          empresaId: this.contexto.empresaId,
          pixChave: dados.chave,
          pixNomeRecebedor: dados.nomeRecebedor,
          pixCidade: dados.cidade,
        },
        update: {
          pixChave: dados.chave,
          pixNomeRecebedor: dados.nomeRecebedor,
          pixCidade: dados.cidade,
        },
      });

      await registrarAtividade(tx, {
        entidade: "FINANCEIRO",
        acao: "PIX_CONFIGURADO",
        resumo: `Pix do Beatus configurado: recebedor ${dados.nomeRecebedor} (${dados.cidade}).`,
        operador,
      });
    });

    return this.buscar();
  }
}

export function criarPixConfiguracaoRepositoryPostgres(
  contexto: EmpresaContext
): PixConfiguracaoRepositoryPort {
  return new PixConfiguracaoRepositoryPostgres(contexto);
}
