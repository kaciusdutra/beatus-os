import "server-only";

import { prisma } from "@/lib/prisma";

import { Prisma } from "@/lib/generated/prisma/client";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type {
  ConfiguracaoSalva,
  MarketplaceRepositoryPort,
} from "../marketplaceRepositoryPort";

import type {
  EventoDaPlataforma,
  EventoRegistrado,
  PendenciasDaIntegracao,
  StatusDoEvento,
  VinculoDeItem,
} from "../../types/marketplace";

type LinhaDeEvento = {
  id: string;
  canal: string;
  eventoId: string;
  pedidoExternoId: string | null;
  tipo: string;
  status: string;
  erro: string | null;
  pedidoId: string | null;
  confirmadoEm: Date | null;
  confirmacaoErro: string | null;
  recebidoEm: Date;
  processadoEm: Date | null;
};

function mapearEvento(linha: LinhaDeEvento): EventoRegistrado {
  return {
    id: linha.id,
    canal: linha.canal,
    eventoId: linha.eventoId,
    pedidoExternoId: linha.pedidoExternoId ?? undefined,
    tipo: linha.tipo,
    status: linha.status as StatusDoEvento,
    erro: linha.erro ?? undefined,
    pedidoId: linha.pedidoId ?? undefined,
    confirmadoEm: linha.confirmadoEm?.toISOString(),
    confirmacaoErro: linha.confirmacaoErro ?? undefined,
    recebidoEm: linha.recebidoEm.toISOString(),
    processadoEm: linha.processadoEm?.toISOString(),
  };
}

function mapearVinculo(linha: {
  id: string;
  canal: string;
  codigoItemExterno: string;
  nomeExterno: string | null;
  produtoId: string | null;
  produto: { nome: string } | null;
}): VinculoDeItem {
  return {
    id: linha.id,
    canal: linha.canal,
    codigoItemExterno: linha.codigoItemExterno,
    nomeExterno: linha.nomeExterno ?? undefined,
    produtoId: linha.produtoId ?? undefined,
    produtoNome: linha.produto?.nome,
  };
}

const CONFIGURACAO_PADRAO: ConfiguracaoSalva = {
  ativo: false,
  aceiteAutomatico: true,
  modoSimulacao: true,
};

export class MarketplaceRepositoryPostgres implements MarketplaceRepositoryPort {
  constructor(private readonly contexto: EmpresaContext) {}

  private get empresaId(): string {
    return this.contexto.empresaId;
  }

  async buscarConfiguracao(canal: string): Promise<ConfiguracaoSalva> {
    const linha = await prisma.integracaoMarketplace.findUnique({
      where: { empresaId_canal: { empresaId: this.empresaId, canal } },
    });

    if (!linha) {
      return { ...CONFIGURACAO_PADRAO };
    }

    return {
      ativo: linha.ativo,
      aceiteAutomatico: linha.aceiteAutomatico,
      modoSimulacao: linha.modoSimulacao,
      idDaLoja: linha.idDaLoja ?? undefined,
      ultimoContatoEm: linha.ultimoContatoEm?.toISOString(),
      ultimaFalha: linha.ultimaFalha ?? undefined,
    };
  }

  async salvarConfiguracao(
    canal: string,
    dados: Pick<ConfiguracaoSalva, "ativo" | "aceiteAutomatico" | "modoSimulacao" | "idDaLoja">
  ): Promise<ConfiguracaoSalva> {
    await prisma.integracaoMarketplace.upsert({
      where: { empresaId_canal: { empresaId: this.empresaId, canal } },
      create: {
        empresaId: this.empresaId,
        canal,
        ativo: dados.ativo,
        aceiteAutomatico: dados.aceiteAutomatico,
        modoSimulacao: dados.modoSimulacao,
        idDaLoja: dados.idDaLoja ?? null,
      },
      update: {
        ativo: dados.ativo,
        aceiteAutomatico: dados.aceiteAutomatico,
        modoSimulacao: dados.modoSimulacao,
        idDaLoja: dados.idDaLoja ?? null,
      },
    });

    return this.buscarConfiguracao(canal);
  }

  async registrarContato(canal: string, falha?: string): Promise<void> {
    await prisma.integracaoMarketplace.upsert({
      where: { empresaId_canal: { empresaId: this.empresaId, canal } },
      create: {
        empresaId: this.empresaId,
        canal,
        ultimoContatoEm: falha ? null : new Date(),
        ultimaFalha: falha ?? null,
      },
      update: falha
        ? { ultimaFalha: falha }
        : { ultimoContatoEm: new Date(), ultimaFalha: null },
    });
  }

  async registrarEvento(
    canal: string,
    evento: EventoDaPlataforma
  ): Promise<{ registro: EventoRegistrado; novo: boolean }> {
    try {
      const criado = await prisma.eventoMarketplace.create({
        data: {
          empresaId: this.empresaId,
          canal,
          eventoId: evento.eventoId,
          pedidoExternoId: evento.pedidoExternoId ?? null,
          tipo: evento.tipo,
          payload: (evento.bruto ?? {}) as Prisma.InputJsonValue,
        },
      });

      return { registro: mapearEvento(criado), novo: true };
    } catch (error) {
      // O mesmo evento já chegou antes: devolve o que existe.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existente = await prisma.eventoMarketplace.findFirst({
          where: { empresaId: this.empresaId, canal, eventoId: evento.eventoId },
        });

        if (existente) {
          return { registro: mapearEvento(existente), novo: false };
        }
      }

      throw error;
    }
  }

  async atualizarEvento(
    id: string,
    dados: Parameters<MarketplaceRepositoryPort["atualizarEvento"]>[1]
  ): Promise<void> {
    await prisma.eventoMarketplace.update({
      where: { id },
      data: {
        ...(dados.status !== undefined ? { status: dados.status } : {}),
        ...(dados.erro !== undefined ? { erro: dados.erro } : {}),
        ...(dados.pedidoId !== undefined ? { pedidoId: dados.pedidoId } : {}),
        ...(dados.confirmadoEm !== undefined ? { confirmadoEm: dados.confirmadoEm } : {}),
        ...(dados.confirmacaoErro !== undefined ? { confirmacaoErro: dados.confirmacaoErro } : {}),
        ...(dados.processadoEm !== undefined ? { processadoEm: dados.processadoEm } : {}),
      },
    });
  }

  async listarEventos(canal: string | undefined, limite: number): Promise<EventoRegistrado[]> {
    const linhas = await prisma.eventoMarketplace.findMany({
      where: { empresaId: this.empresaId, ...(canal ? { canal } : {}) },
      orderBy: { recebidoEm: "desc" },
      take: limite,
    });

    return linhas.map(mapearEvento);
  }

  async buscarPedidoCriado(canal: string, pedidoExternoId: string): Promise<string | null> {
    const evento = await prisma.eventoMarketplace.findFirst({
      where: {
        empresaId: this.empresaId,
        canal,
        pedidoExternoId,
        tipo: "PEDIDO_NOVO",
        status: "PROCESSADO",
        pedidoId: { not: null },
      },
      orderBy: { recebidoEm: "asc" },
    });

    return evento?.pedidoId ?? null;
  }

  async resolverVinculos(
    canal: string,
    itens: { codigoItemExterno: string; nome: string }[]
  ): Promise<Map<string, string | null>> {
    const resultado = new Map<string, string | null>();

    for (const item of itens) {
      const vinculo = await prisma.vinculoItemMarketplace.upsert({
        where: {
          empresaId_canal_codigoItemExterno: {
            empresaId: this.empresaId,
            canal,
            codigoItemExterno: item.codigoItemExterno,
          },
        },
        // Item novo entra como pendente, esperando o Kacius ligar a um produto.
        create: {
          empresaId: this.empresaId,
          canal,
          codigoItemExterno: item.codigoItemExterno,
          nomeExterno: item.nome,
        },
        update: {},
      });

      resultado.set(item.codigoItemExterno, vinculo.produtoId);
    }

    return resultado;
  }

  async listarVinculos(canal: string): Promise<VinculoDeItem[]> {
    const linhas = await prisma.vinculoItemMarketplace.findMany({
      where: { empresaId: this.empresaId, canal },
      include: { produto: { select: { nome: true } } },
      orderBy: [{ produtoId: "asc" }, { nomeExterno: "asc" }],
    });

    return linhas.map(mapearVinculo);
  }

  async ligarVinculo(id: string, produtoId: string | null): Promise<VinculoDeItem> {
    const existente = await prisma.vinculoItemMarketplace.findFirst({
      where: { id, empresaId: this.empresaId },
    });

    if (!existente) {
      throw new Error("Vínculo não encontrado.");
    }

    if (produtoId) {
      const produto = await prisma.produto.findFirst({
        where: { id: produtoId, empresaId: this.empresaId, ativo: true },
      });

      if (!produto) {
        throw new Error("Produto não encontrado ou inativo.");
      }
    }

    const atualizado = await prisma.vinculoItemMarketplace.update({
      where: { id },
      data: { produtoId },
      include: { produto: { select: { nome: true } } },
    });

    return mapearVinculo(atualizado);
  }

  async contarPendencias(): Promise<PendenciasDaIntegracao> {
    const [vinculosPendentes, eventosComErro] = await Promise.all([
      prisma.vinculoItemMarketplace.count({
        where: { empresaId: this.empresaId, produtoId: null },
      }),
      prisma.eventoMarketplace.count({
        where: { empresaId: this.empresaId, status: "ERRO" },
      }),
    ]);

    return { vinculosPendentes, eventosComErro };
  }
}

export function criarMarketplaceRepositoryPostgres(
  contexto: EmpresaContext
): MarketplaceRepositoryPort {
  return new MarketplaceRepositoryPostgres(contexto);
}
