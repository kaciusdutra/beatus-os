import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type { ClienteConsultaRepositoryPort } from "../clienteConsultaRepositoryPort";

import type { ClienteDetalhe, ClienteListado } from "../../types/consultaCliente";

type LinhaDeCliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  ativo: boolean;
  origemPrimeiroPedido: string | null;
  criadoEm: Date;
};

type Estatistica = { quantidade: number; valor: number; ultimo?: Date };

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function montar(cliente: LinhaDeCliente, estatistica?: Estatistica): ClienteListado {
  const quantidade = estatistica?.quantidade ?? 0;

  const valor = arredondar(estatistica?.valor ?? 0);

  return {
    id: cliente.id,
    nome: cliente.nome,
    telefone: cliente.telefone,
    email: cliente.email ?? undefined,
    ativo: cliente.ativo,
    origemPrimeiroPedido: cliente.origemPrimeiroPedido ?? undefined,
    criadoEm: cliente.criadoEm.toISOString(),
    quantidadePedidos: quantidade,
    valorTotal: valor,
    ticketMedio: quantidade > 0 ? arredondar(valor / quantidade) : 0,
    ultimoPedidoEm: estatistica?.ultimo?.toISOString(),
  };
}

export class ClienteConsultaRepositoryPostgres
  implements ClienteConsultaRepositoryPort
{
  constructor(private readonly contexto: EmpresaContext) {}

  private async estatisticas(clienteIds: string[]): Promise<Map<string, Estatistica>> {
    const grupos = await prisma.pedido.groupBy({
      by: ["clienteId"],
      where: {
        empresaId: this.contexto.empresaId,
        clienteId: { in: clienteIds },
        statusOperacional: { not: "CANCELADO" },
      },
      _count: { _all: true },
      _sum: { total: true },
      _max: { criadoEm: true },
    });

    return new Map(
      grupos.map((grupo) => [
        grupo.clienteId,
        {
          quantidade: grupo._count._all,
          valor: Number(grupo._sum.total ?? 0),
          ultimo: grupo._max.criadoEm ?? undefined,
        },
      ])
    );
  }

  async listar(busca: string | undefined, limite: number): Promise<ClienteListado[]> {
    const termo = busca?.trim();

    const clientes = await prisma.cliente.findMany({
      where: {
        empresaId: this.contexto.empresaId,
        ...(termo
          ? {
              OR: [
                { nome: { contains: termo, mode: "insensitive" as const } },
                { telefone: { contains: termo } },
                { cpf: { contains: termo } },
                { email: { contains: termo, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { nome: "asc" },
      take: limite,
    });

    const estatisticas = await this.estatisticas(clientes.map((cliente) => cliente.id));

    return clientes.map((cliente) => montar(cliente, estatisticas.get(cliente.id)));
  }

  async buscarDetalhe(id: string): Promise<ClienteDetalhe | null> {
    const cliente = await prisma.cliente.findFirst({
      where: { id, empresaId: this.contexto.empresaId },
      include: { enderecos: true },
    });

    if (!cliente) {
      return null;
    }

    const [estatisticas, recentes] = await Promise.all([
      this.estatisticas([cliente.id]),
      prisma.pedido.findMany({
        where: { empresaId: this.contexto.empresaId, clienteId: cliente.id },
        orderBy: { criadoEm: "desc" },
        take: 10,
        select: {
          id: true,
          numero: true,
          canal: true,
          statusOperacional: true,
          total: true,
          criadoEm: true,
        },
      }),
    ]);

    return {
      ...montar(cliente, estatisticas.get(cliente.id)),
      cpf: cliente.cpf,
      dataNascimento: cliente.dataNascimento
        ? cliente.dataNascimento.toISOString().slice(0, 10)
        : undefined,
      enderecos: cliente.enderecos
        .sort((a, b) => Number(b.principal) - Number(a.principal))
        .map((endereco) => ({
          id: endereco.id,
          rotulo: endereco.rotulo,
          principal: endereco.principal,
          texto: [
            [endereco.logradouro, endereco.numero].filter(Boolean).join(", "),
            endereco.complemento,
            endereco.bairro,
            [endereco.cidade, endereco.estado].filter(Boolean).join("/"),
            endereco.cep,
          ]
            .filter(Boolean)
            .join(" - "),
        })),
      pedidosRecentes: recentes.map((pedido) => ({
        id: pedido.id,
        numero: pedido.numero,
        canal: pedido.canal,
        status: pedido.statusOperacional,
        total: Number(pedido.total),
        criadoEm: pedido.criadoEm.toISOString(),
      })),
    };
  }
}

export function criarClienteConsultaRepositoryPostgres(
  contexto: EmpresaContext
): ClienteConsultaRepositoryPort {
  return new ClienteConsultaRepositoryPostgres(contexto);
}
