import { NextResponse } from "next/server";

import { criarCustoFixoServicePostgres } from "@/modules/precificacao/services/server/custoFixoServiceFactory";

const custoFixoService = criarCustoFixoServicePostgres();

// Estimativa de pedidos por mês: base do rateio dos custos fixos.
export async function PUT(request: Request) {
  try {
    const corpo = await request.json();

    const configuracao = await custoFixoService.salvarPedidosMensais(
      Number(corpo?.pedidosMensaisEstimados)
    );

    return NextResponse.json({ sucesso: true, configuracao });
  } catch (error) {
    console.error("ERRO AO SALVAR OS PEDIDOS POR MÊS:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar os pedidos por mês.",
      },
      { status: 400 }
    );
  }
}
