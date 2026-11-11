import { NextResponse } from "next/server";

import { criarPrecificacaoServicePostgres } from "@/modules/precificacao/services/server/precificacaoServiceFactory";

import type { CanalDeVenda } from "@/modules/precificacao/types/precificacao";

const precificacaoService = criarPrecificacaoServicePostgres();

// Preço praticado de um produto em um canal. preco = null remove o preço.
export async function PUT(request: Request) {
  try {
    const corpo = await request.json();

    await precificacaoService.salvarPreco(
      typeof corpo?.produtoId === "string" ? corpo.produtoId : "",
      corpo?.canal as CanalDeVenda,
      corpo?.preco === null || corpo?.preco === ""
        ? null
        : Number(corpo?.preco)
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("ERRO AO SALVAR O PREÇO:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o preço.",
      },
      { status: 400 }
    );
  }
}
