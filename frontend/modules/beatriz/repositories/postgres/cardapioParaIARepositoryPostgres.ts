import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type { CanalPedido } from "@/modules/pedidos/types/pedido";

import { montarCardapioParaIA } from "../../services/cardapioParaIA";

import type { CardapioParaIAPort } from "../cardapioParaIAPort";

export class CardapioParaIARepositoryPostgres implements CardapioParaIAPort {
  constructor(private readonly contexto: EmpresaContext) {}

  async carregar(canal: CanalPedido) {
    const [produtos, precos] = await Promise.all([
      prisma.produto.findMany({
        where: { empresaId: this.contexto.empresaId, ativo: true },
        select: { id: true, nome: true, descricao: true, categoria: true, ativo: true },
      }),
      prisma.precoProduto.findMany({ where: { empresaId: this.contexto.empresaId } }),
    ]);

    return montarCardapioParaIA(
      produtos,
      precos.map((preco) => ({
        produtoId: preco.produtoId,
        canal: preco.canal,
        preco: Number(preco.preco),
      })),
      canal
    );
  }
}

export function criarCardapioParaIARepositoryPostgres(contexto: EmpresaContext): CardapioParaIAPort {
  return new CardapioParaIARepositoryPostgres(contexto);
}
