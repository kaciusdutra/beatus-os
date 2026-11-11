import { NextResponse } from "next/server";

import { criarPrecificacaoServicePostgres } from "@/modules/precificacao/services/server/precificacaoServiceFactory";

import type { CanalDeVenda } from "@/modules/precificacao/types/precificacao";

const precificacaoService = criarPrecificacaoServicePostgres();

// Comissão, taxa mensal e pedidos por mês de um canal de venda.
export async function PUT(request: Request) {
  try {
    const corpo = await request.json();

    const canal = await precificacaoService.salvarCanal({
      canal: corpo?.canal as CanalDeVenda,
      comissaoPercentual: Number(corpo?.comissaoPercentual),
      taxaMensal: Number(corpo?.taxaMensal),
      pedidosMensaisEstimados: Number(corpo?.pedidosMensaisEstimados),
      ativo: corpo?.ativo !== false,
    });

    return NextResponse.json({ sucesso: true, canal });
  } catch (error) {
    console.error("ERRO AO SALVAR O CANAL:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o canal.",
      },
      { status: 400 }
    );
  }
}
