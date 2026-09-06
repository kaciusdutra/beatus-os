import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

export async function GET() {
  try {
    const contexto =
      criarContextoDesenvolvimento();

    const unidades =
      await prisma.unidadeMedida.findMany({
        where: {
          empresaId: contexto.empresaId,
          ativo: true,
        },
        orderBy: {
          abreviacao: "asc",
        },
      });

    return NextResponse.json({
      sucesso: true,
      unidades,
    });
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao listar unidades.";

    console.error(
      "Erro ao listar unidades de insumos:",
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