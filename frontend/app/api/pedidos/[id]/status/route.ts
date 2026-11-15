import { NextResponse } from "next/server";

import { getOperacaoPedidoService } from "@/modules/pedidos/services/server/operacaoPedidoService";

import { usuarioDosCabecalhos } from "@/core/auth/cabecalhos";

import { possuiPermissao } from "@/core/permissions/permissionMatrix";

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

    // A cozinha (produção) pode iniciar o preparo e marcar pronto; cancelar é de quem gerencia pedidos.
    const usuario = usuarioDosCabecalhos(request.headers);

    if (corpo?.status === "CANCELADO" && (!usuario || !possuiPermissao(usuario.papel, "pedidos.gerenciar"))) {
      return NextResponse.json({ sucesso: false, mensagem: "Seu perfil não pode cancelar pedidos." }, { status: 403 });
    }

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
