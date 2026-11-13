import { NextResponse } from "next/server";

import { getOperacaoPedidoService } from "@/modules/pedidos/services/server/operacaoPedidoService";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Muda o status do pedido: EM_PREPARO, PRONTO, EM_ROTA, ENTREGUE ou CANCELADO.
// Corpo: { status, motivo?, devolucoes?: [{ id, quantidade }] }
// Iniciar preparo baixa o estoque; cancelar exige motivo.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json();

    const resultado = await getOperacaoPedidoService().mudarStatus({
      pedidoId: id,
      novoStatus: typeof corpo?.status === "string" ? corpo.status : "",
      motivo: typeof corpo?.motivo === "string" ? corpo.motivo : undefined,
      devolucoes: Array.isArray(corpo?.devolucoes)
        ? corpo.devolucoes.map(
            (item: { id?: unknown; quantidade?: unknown }) => ({
              id: typeof item?.id === "string" ? item.id : "",
              quantidade: Number(item?.quantidade),
            })
          )
        : undefined,
      operador: operadorDaRequisicao(request),
    });

    return NextResponse.json({ sucesso: true, ...resultado });
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível mudar o status do pedido.";

    console.error("ERRO AO MUDAR O STATUS DO PEDIDO:", error);

    return NextResponse.json(
      { sucesso: false, mensagem },
      { status: mensagem === "Pedido não encontrado." ? 404 : 400 }
    );
  }
}
