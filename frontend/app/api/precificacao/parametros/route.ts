import { NextResponse } from "next/server";

import { criarPrecificacaoServicePostgres } from "@/modules/precificacao/services/server/precificacaoServiceFactory";

const precificacaoService = criarPrecificacaoServicePostgres();

// Imposto, taxa de pagamento, embalagem do pedido, produtos por pedido e margens.
export async function PUT(request: Request) {
  try {
    const corpo = await request.json();

    const parametros = await precificacaoService.salvarParametros({
      impostoPercentual: Number(corpo?.impostoPercentual),
      taxaPagamentoPercentual: Number(corpo?.taxaPagamentoPercentual),
      embalagemPedido: Number(corpo?.embalagemPedido),
      itensPorPedidoEstimados: Number(corpo?.itensPorPedidoEstimados),
      margensCenario:
        typeof corpo?.margensCenario === "string"
          ? corpo.margensCenario
          : "",
      margemMinimaPercentual: Number(corpo?.margemMinimaPercentual),
    });

    return NextResponse.json({ sucesso: true, parametros });
  } catch (error) {
    console.error("ERRO AO SALVAR OS PARÂMETROS:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar os parâmetros.",
      },
      { status: 400 }
    );
  }
}
