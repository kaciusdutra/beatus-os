import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

export async function GET() {
  try {
    const contexto =
      criarContextoDesenvolvimento();

    const categorias =
      await prisma.categoriaInsumo.findMany({
        where: {
          empresaId: contexto.empresaId,
          ativo: true,
        },
        orderBy: {
          nome: "asc",
        },
      });

    return NextResponse.json({
      sucesso: true,
      categorias,
    });
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao listar categorias.";

    console.error(
      "Erro ao listar categorias de insumos:",
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