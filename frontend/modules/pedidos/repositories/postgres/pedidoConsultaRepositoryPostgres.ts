import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type { PedidoConsultaRepositoryPort } from "../pedidoConsultaRepositoryPort";

import type { StatusOperacional } from "../../types/pedido";

import type { PedidoDetalhe, PedidoListado } from "../../types/consultaPedido";

type LinhaDeLista = {
  id: string;
  numero: string;
  canal: string;
  entrada: string;
  statusOperacional: string;
  total: unknown;
  criadoEm: Date;
  cliente: { id: string; nome: string; telefone: string };
  itens: { quantidade: number }[];
  pagamentos: { forma: string; status: string }[];
};

function mapearListado(pedido: LinhaDeLista): PedidoListado {
  return {
    id: pedido.id,
    numero: pedido.numero,
    canal: pedido.canal,
    entrada: pedido.entrada,
    status: pedido.statusOperacional as StatusOperacional,
    total: Number(pedido.total),
    criadoEm: pedido.criadoEm.toISOString(),
    cliente: {
      id: pedido.cliente.id,
      nome: pedido.cliente.nome,
      telefone: pedido.cliente.telefone,
    },
    quantidadeItens: pedido.itens.reduce((soma, item) => soma + item.quantidade, 0),
    formaPagamento: pedido.pagamentos[0]?.forma,
    pagamentoStatus: pedido.pagamentos[0]?.status,
  };
}

export class PedidoConsultaRepositoryPostgres
  implements PedidoConsultaRepositoryPort
{
  constructor(private readonly contexto: EmpresaContext) {}

  async listar(
    filtro: Parameters<PedidoConsultaRepositoryPort["listar"]>[0]
  ): Promise<PedidoListado[]> {
    const busca = filtro.busca?.trim();

    const pedidos = await prisma.pedido.findMany({
      where: {
        empresaId: this.contexto.empresaId,
        ...(filtro.status ? { statusOperacional: filtro.status } : {}),
        ...(filtro.canal ? { canal: filtro.canal } : {}),
        ...(filtro.clienteId ? { clienteId: filtro.clienteId } : {}),
        ...(filtro.de || filtro.ate
          ? {
              criadoEm: {
                ...(filtro.de ? { gte: filtro.de } : {}),
                ...(filtro.ate ? { lt: filtro.ate } : {}),
              },
            }
          : {}),
        ...(busca
          ? {
              OR: [
                { numero: { contains: busca, mode: "insensitive" as const } },
                { cliente: { nome: { contains: busca, mode: "insensitive" as const } } },
                { cliente: { telefone: { contains: busca } } },
              ],
            }
          : {}),
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        itens: { select: { quantidade: true } },
        pagamentos: { select: { forma: true, status: true } },
      },
      orderBy: { criadoEm: "desc" },
      take: filtro.limite,
    });

    return pedidos.map(mapearListado);
  }

  async buscarDetalhe(id: string): Promise<PedidoDetalhe | null> {
    const pedido = await prisma.pedido.findFirst({
      where: { id, empresaId: this.contexto.empresaId },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        itens: { orderBy: { criadoEm: "asc" } },
        pagamentos: { orderBy: { criadoEm: "asc" } },
      },
    });

    if (!pedido) {
      return null;
    }

    const atividades = await prisma.registroAtividade.findMany({
      where: {
        empresaId: this.contexto.empresaId,
        entidade: "PEDIDO",
        referenciaId: pedido.id,
      },
      orderBy: { criadoEm: "asc" },
    });

    const endereco = [
      [pedido.enderecoLogradouro, pedido.enderecoNumero].filter(Boolean).join(", "),
      pedido.enderecoComplemento,
      pedido.enderecoBairro,
      [pedido.enderecoCidade, pedido.enderecoEstado].filter(Boolean).join("/"),
      pedido.enderecoCep,
    ]
      .filter(Boolean)
      .join(" - ");

    return {
      ...mapearListado(pedido),
      subtotal: Number(pedido.subtotal),
      descontos: Number(pedido.descontos),
      taxaEntrega: Number(pedido.taxaEntrega),
      distanciaEntregaKm:
        pedido.distanciaEntregaKm === null ? undefined : Number(pedido.distanciaEntregaKm),
      endereco,
      itens: pedido.itens.map((item) => ({
        id: item.id,
        nome: item.nome,
        quantidade: item.quantidade,
        precoUnitario: Number(item.precoUnitario),
        subtotal: Number(item.subtotal),
        observacao: item.observacao ?? undefined,
      })),
      pagamentos: pedido.pagamentos.map((pagamento) => ({
        id: pagamento.id,
        modalidade: pagamento.modalidade,
        forma: pagamento.forma,
        status: pagamento.status,
        valor: Number(pagamento.valor),
        aprovadoEm: pagamento.aprovadoEm?.toISOString(),
      })),
      atividades: atividades.map((atividade) => ({
        id: atividade.id,
        acao: atividade.acao,
        resumo: atividade.resumo,
        operador: atividade.operador ?? undefined,
        criadoEm: atividade.criadoEm.toISOString(),
      })),
    };
  }
}

export function criarPedidoConsultaRepositoryPostgres(
  contexto: EmpresaContext
): PedidoConsultaRepositoryPort {
  return new PedidoConsultaRepositoryPostgres(contexto);
}
