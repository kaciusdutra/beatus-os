import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { criarInsumoServicePostgres } from "@/modules/insumos/services/server/insumoServiceFactory";

const EMPRESA_DESENVOLVIMENTO_ID =
  "00000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const service =
      criarInsumoServicePostgres();

    const insumos =
      await service.listar();

    return NextResponse.json({
      sucesso: true,
      insumos,
    });
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao listar insumos.";

    console.error(
      "Erro ao listar insumos:",
      erro,
    );

    return NextResponse.json(
      {
        sucesso: false,
        erro: mensagem,
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      await request.json();

    const nome =
      typeof body.nome === "string"
        ? body.nome.trim()
        : "";

    const categoriaId =
      typeof body.categoriaId === "string"
        ? body.categoriaId.trim()
        : "";

    const unidadeCompraId =
      typeof body.unidadeCompraId === "string"
        ? body.unidadeCompraId.trim()
        : "";

    const quantidadeCompra =
      Number(body.quantidadeCompra);

    const precoCompra =
      Number(body.precoCompra);

    const fornecedorId =
      typeof body.fornecedorId === "string"
        ? body.fornecedorId.trim() ||
          undefined
        : undefined;

    const observacao =
      typeof body.observacao === "string"
        ? body.observacao.trim() ||
          undefined
        : undefined;

    if (!nome) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            "Nome do insumo é obrigatório.",
        },
        { status: 400 },
      );
    }

    if (!categoriaId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            "Categoria do insumo é obrigatória.",
        },
        { status: 400 },
      );
    }

    if (!unidadeCompraId) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            "Unidade de compra é obrigatória.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(
        quantidadeCompra,
      ) ||
      quantidadeCompra <= 0
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            "Quantidade de compra deve ser maior que zero.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(
        precoCompra,
      ) ||
      precoCompra < 0
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            "Preço de compra inválido.",
        },
        { status: 400 },
      );
    }

    const categoria =
      await prisma.categoriaInsumo.findFirst({
        where: {
          id: categoriaId,
          empresaId:
            EMPRESA_DESENVOLVIMENTO_ID,
          ativo: true,
        },
      });

    if (!categoria) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            "Categoria de insumo não encontrada ou inativa.",
        },
        { status: 400 },
      );
    }

    const unidade =
      await prisma.unidadeMedida.findFirst({
        where: {
          id: unidadeCompraId,
          empresaId:
            EMPRESA_DESENVOLVIMENTO_ID,
          ativo: true,
        },
      });

    if (!unidade) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            "Unidade de medida não encontrada ou inativa.",
        },
        { status: 400 },
      );
    }

    const agora =
      new Date().toISOString();

    const id =
      crypto.randomUUID();

    const service =
      criarInsumoServicePostgres();

    const insumo =
      await service.criar({
        id,
        nome,
        categoriaId,
        unidadeCompraId,
        quantidadeCompra,
        precoCompra,
        custoUnitario:
          precoCompra /
          quantidadeCompra,
        fornecedorId,
        ativo: true,
        observacao,
        criadoEm: agora,
        atualizadoEm: agora,
      });

    return NextResponse.json(
      {
        sucesso: true,
        insumo,
      },
      { status: 201 },
    );
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao criar insumo.";

    console.error(
      "Erro ao criar insumo:",
      erro,
    );

    if (
      mensagem.includes(
        "Unique constraint",
      )
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            "Já existe um insumo com esse nome nesta empresa.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        sucesso: false,
        erro: mensagem,
      },
      { status: 500 },
    );
  }
}