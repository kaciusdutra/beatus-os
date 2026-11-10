import { prisma } from "@/lib/prisma";

import {
  EmpresaContext,
} from "@/core/context/empresaContext";

import {
  ProdutoRepositoryPort,
} from "../produtoRepositoryPort";

import { Produto } from "../../types/produto";

function mapearProduto(produto: {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  preco: unknown;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}): Produto {
  return {
    id: produto.id,
    nome: produto.nome,
    descricao: produto.descricao,
    categoria: produto.categoria,
    preco: Number(produto.preco),
    ativo: produto.ativo,
    criadoEm: produto.criadoEm.toISOString(),
    atualizadoEm: produto.atualizadoEm.toISOString(),
  };
}

export class ProdutoRepositoryPostgres
  implements ProdutoRepositoryPort
{
  constructor(
    private readonly contexto: EmpresaContext
  ) {}

  async listar(): Promise<Produto[]> {
    const produtos =
      await prisma.produto.findMany({
        where: {
          empresaId: this.contexto.empresaId,
        },
        orderBy: {
          nome: "asc",
        },
      });

    return produtos.map(mapearProduto);
  }

  async criar(produto: Produto): Promise<Produto> {
    const criado = await prisma.produto.create({
      data: {
        id: produto.id,
        empresaId: this.contexto.empresaId,
        nome: produto.nome,
        descricao: produto.descricao,
        categoria: produto.categoria,
        preco: produto.preco,
        ativo: produto.ativo,
        criadoEm: new Date(produto.criadoEm),
        atualizadoEm: new Date(produto.atualizadoEm),
      },
    });

    return mapearProduto(criado);
  }
}
