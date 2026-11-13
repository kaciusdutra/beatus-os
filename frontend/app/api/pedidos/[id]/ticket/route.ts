import { NextResponse } from "next/server";

import { getOperacaoPedidoService } from "@/modules/pedidos/services/server/operacaoPedidoService";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Dados do ticket da cozinha.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const ticket = await getOperacaoPedidoService().dadosDoTicket(id);

    return NextResponse.json({ sucesso: true, ticket });
  } catch (error) {
    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível montar o ticket.",
      },
      { status: 404 }
    );
  }
}

// Marca o ticket como IMPRESSO ou FALHOU. Corpo: { status }
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json();

    await getOperacaoPedidoService().marcarTicket(
      id,
      corpo?.status === "FALHOU" ? "FALHOU" : "IMPRESSO",
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o ticket.",
      },
      { status: 400 }
    );
  }
}
