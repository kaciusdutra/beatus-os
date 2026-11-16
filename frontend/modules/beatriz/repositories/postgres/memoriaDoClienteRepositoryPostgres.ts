import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import { mesclarEtiquetas } from "@/core/memoria/etiquetasDoCliente";

import { favoritosDosPedidos, ultimoPedidoParaMemoria } from "../../services/memoriaParaIA";

import type { MemoriaDoCliente } from "../../types/beatriz";

import type { MemoriaDoClientePort } from "../memoriaDoClientePort";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Quem conversou e ainda não virou cliente é esquecido depois de 30 dias.
export const DIAS_DO_CONTATO = 30;

// Quantos pedidos recentes a Beatriz olha para achar o último e os favoritos.
const PEDIDOS_CONSULTADOS = 12;

export class MemoriaDoClienteRepositoryPostgres implements MemoriaDoClientePort {
  constructor(
    private readonly contexto: EmpresaContext,
    private readonly agora: () => Date = () => new Date()
  ) {}

  async carregar(telefone: string): Promise<MemoriaDoCliente> {
    const empresaId = this.contexto.empresaId;

    const cliente = await prisma.cliente.findFirst({ where: { empresaId, telefone, ativo: true } });

    if (cliente) {
      const pedidos = await prisma.pedido.findMany({
        where: { empresaId, clienteId: cliente.id, statusOperacional: { not: "CANCELADO" } },
        orderBy: { criadoEm: "desc" },
        take: PEDIDOS_CONSULTADOS,
        include: { itens: { select: { nome: true, quantidade: true } } },
      });

      const paraMemoria = pedidos.map((pedido) => ({ criadoEm: pedido.criadoEm, itens: pedido.itens }));

      return {
        conhecido: true,
        nome: cliente.nome.trim().split(/\s+/)[0] || undefined,
        etiquetas: cliente.etiquetas,
        aceitaClube: cliente.aceitaMarketing,
        quantidadeDePedidos: cliente.quantidadePedidos,
        ultimoPedido: ultimoPedidoParaMemoria(paraMemoria, this.agora()),
        favoritos: favoritosDosPedidos(paraMemoria),
      };
    }

    const contato = await prisma.contatoDaBeatriz.findUnique({ where: { empresaId_telefone: { empresaId, telefone } } });

    const vigente = contato && contato.expiraEm.getTime() > this.agora().getTime() ? contato : null;

    return {
      conhecido: false,
      etiquetas: vigente?.etiquetas ?? [],
      aceitaClube: false,
      quantidadeDePedidos: 0,
      favoritos: [],
    };
  }

  async gravar(telefone: string, mudanca: { adicionar: string[]; remover: string[] }): Promise<string[]> {
    const empresaId = this.contexto.empresaId;

    const agora = this.agora();

    const cliente = await prisma.cliente.findFirst({ where: { empresaId, telefone, ativo: true }, select: { id: true, etiquetas: true } });

    if (cliente) {
      const etiquetas = mesclarEtiquetas(cliente.etiquetas, mudanca);

      await prisma.cliente.update({ where: { id: cliente.id }, data: { etiquetas } });

      return etiquetas;
    }

    // Contatos vencidos saem junto, sem precisar de uma tarefa agendada.
    await prisma.contatoDaBeatriz.deleteMany({ where: { empresaId, expiraEm: { lt: agora } } });

    const contato = await prisma.contatoDaBeatriz.findUnique({ where: { empresaId_telefone: { empresaId, telefone } } });

    const etiquetas = mesclarEtiquetas(contato?.etiquetas ?? [], mudanca);

    const expiraEm = new Date(agora.getTime() + DIAS_DO_CONTATO * MS_POR_DIA);

    await prisma.contatoDaBeatriz.upsert({
      where: { empresaId_telefone: { empresaId, telefone } },
      create: { empresaId, telefone, etiquetas, expiraEm },
      update: { etiquetas, expiraEm },
    });

    return etiquetas;
  }
}

// Quando o cadastro nasce (no checkout), o que a Beatriz aprendeu do contato passa para o cliente e o contato é apagado.
export async function absorverContatoDaBeatriz(empresaId: string, telefone: string, clienteId: string): Promise<void> {
  const contato = await prisma.contatoDaBeatriz.findUnique({ where: { empresaId_telefone: { empresaId, telefone } } });

  if (!contato) {
    return;
  }

  if (contato.etiquetas.length > 0 && contato.expiraEm.getTime() > Date.now()) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { etiquetas: true } });

    await prisma.cliente.update({
      where: { id: clienteId },
      data: { etiquetas: mesclarEtiquetas(cliente?.etiquetas ?? [], { adicionar: contato.etiquetas, remover: [] }) },
    });
  }

  await prisma.contatoDaBeatriz.delete({ where: { id: contato.id } });
}
