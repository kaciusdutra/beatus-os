import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import type { ConferenciaMarketplaceRepositoryPort } from "../conferenciaMarketplaceRepositoryPort";

import type {
  ConferirPedido,
  PedidoDoMarketplace,
  StatusDaConferencia,
} from "../../types/conferenciaMarketplace";

// Datas guardadas ao meio-dia local e lidas pelos campos locais, para o dia
// nunca virar por fuso.
function textoDaData(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const dia = String(data.getDate()).padStart(2, "0");

  return `${data.getFullYear()}-${mes}-${dia}`;
}

function moeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

type Linha = {
  id: string;
  numero: string;
  canal: string;
  codigoExterno: string | null;
  nomeClienteExterno: string | null;
  criadoEm: Date;
  total: unknown;
  comissaoEsperada: unknown;
  liquidoEsperado: unknown;
  conferenciaStatus: string | null;
  valorRecebido: unknown;
  conferidoEm: Date | null;
  observacaoConferencia: string | null;
  statusOperacional: string;
};

function mapear(linha: Linha): PedidoDoMarketplace {
  const esperado = Number(linha.liquidoEsperado ?? 0);

  const recebido = linha.valorRecebido === null ? undefined : Number(linha.valorRecebido);

  return {
    id: linha.id,
    numero: linha.numero,
    canal: linha.canal,
    codigoExterno: linha.codigoExterno ?? "",
    nomeClienteExterno: linha.nomeClienteExterno ?? undefined,
    criadoEm: linha.criadoEm.toISOString(),
    total: Number(linha.total),
    comissaoEsperada: Number(linha.comissaoEsperada ?? 0),
    liquidoEsperado: esperado,
    status: linha.conferenciaStatus === "CONFERIDO" ? "CONFERIDO" : "AGUARDANDO",
    valorRecebido: recebido,
    diferenca: recebido === undefined ? undefined : Math.round((recebido - esperado) * 100) / 100,
    recebidoEm: linha.conferidoEm ? textoDaData(linha.conferidoEm) : undefined,
    observacao: linha.observacaoConferencia ?? undefined,
    cancelado: linha.statusOperacional === "CANCELADO",
  };
}

export class ConferenciaMarketplaceRepositoryPostgres
  implements ConferenciaMarketplaceRepositoryPort
{
  constructor(private readonly contexto: EmpresaContext) {}

  async listar(status?: StatusDaConferencia): Promise<PedidoDoMarketplace[]> {
    const linhas = await prisma.pedido.findMany({
      where: {
        empresaId: this.contexto.empresaId,
        conferenciaStatus: status ?? { not: null },
      },
      orderBy: { criadoEm: "asc" },
    });

    return linhas.map(mapear);
  }

  async conferir(
    pedidoId: string,
    dados: ConferirPedido,
    operador?: string | null
  ): Promise<PedidoDoMarketplace> {
    return prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({
        where: { id: pedidoId, empresaId: this.contexto.empresaId },
      });

      if (!pedido || !pedido.conferenciaStatus) {
        throw new Error("Pedido de marketplace não encontrado.");
      }

      if (pedido.statusOperacional === "CANCELADO") {
        throw new Error("Pedido cancelado não tem repasse a conferir.");
      }

      if (pedido.conferenciaStatus === "CONFERIDO") {
        throw new Error("Este pedido já foi conferido.");
      }

      const atualizado = await tx.pedido.update({
        where: { id: pedidoId },
        data: {
          conferenciaStatus: "CONFERIDO",
          valorRecebido: dados.valorRecebido,
          conferidoEm: new Date(`${dados.recebidoEm}T12:00:00`),
          observacaoConferencia: dados.observacao ?? null,
        },
      });

      const esperado = Number(pedido.liquidoEsperado ?? 0);

      const diferenca = Math.round((dados.valorRecebido - esperado) * 100) / 100;

      await registrarAtividade(tx, {
        entidade: "PEDIDO",
        acao: "CONFERIDO",
        resumo: `Repasse do pedido ${pedido.numero} (${pedido.canal}, código ${pedido.codigoExterno}) conferido: recebido ${moeda(dados.valorRecebido)} de ${moeda(esperado)} esperados${diferenca !== 0 ? ` (diferença de ${diferenca > 0 ? "+" : "−"}${moeda(Math.abs(diferenca))})` : ""}.`,
        referenciaId: pedidoId,
        referenciaNumero: pedido.numero,
        operador,
      });

      return mapear(atualizado);
    });
  }
}

export function criarConferenciaMarketplaceRepositoryPostgres(
  contexto: EmpresaContext
): ConferenciaMarketplaceRepositoryPort {
  return new ConferenciaMarketplaceRepositoryPostgres(contexto);
}
