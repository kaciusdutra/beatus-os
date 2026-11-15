import "server-only";

import { prisma } from "@/lib/prisma";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import type { CanalPedido } from "../../types/pedido";

import type { ItemSolicitado } from "../../types/pedidoSolicitado";

import { calcularPedidoNoServidor, type PedidoCalculado } from "../calcularPedido";

// Calcula o pedido (preço do canal, taxa de entrega e total) sem gravar nada.
// É a mesma conta do lançamento, usada para cobrar o valor certo (Pix) antes
// de o pedido existir.
export async function calcularPedidoSemGravar(entrada: {
  canal: CanalPedido;
  itens: ItemSolicitado[];
  distanciaEntregaKm: number | null;
}): Promise<PedidoCalculado> {
  const empresaId = criarContextoDesenvolvimento().empresaId;

  const ids = [
    ...new Set(
      entrada.itens.flatMap((item) => [
        item.produtoId,
        ...(item.adicionais ?? []).map((adicional) => adicional.produtoId),
      ])
    ),
  ];

  const [produtos, precos] = await Promise.all([
    prisma.produto.findMany({ where: { empresaId, id: { in: ids } } }),
    prisma.precoProduto.findMany({ where: { empresaId, produtoId: { in: ids } } }),
  ]);

  return calcularPedidoNoServidor({
    canal: entrada.canal,
    itens: entrada.itens,
    distanciaEntregaKm: entrada.distanciaEntregaKm,
    produtos: produtos.map((produto) => ({
      id: produto.id,
      nome: produto.nome,
      categoria: produto.categoria,
      ativo: produto.ativo,
    })),
    precos: precos.map((preco) => ({
      produtoId: preco.produtoId,
      canal: preco.canal,
      preco: Number(preco.preco),
    })),
  });
}
