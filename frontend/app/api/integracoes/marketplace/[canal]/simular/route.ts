import { NextResponse } from "next/server";

import { getIntegracaoMarketplaceService } from "@/modules/marketplace/services/server/integracaoMarketplaceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Simula um evento da plataforma (só no modo simulação).
// Pedido novo: { itens: [{ codigoItemExterno, nome, quantidade, precoUnitario, observacao? }],
//   codigoExibicao?, nomeCliente?, totalDaPlataforma? }
// Cancelamento: { cancelarPedidoExterno: "SIM-..." }
export async function POST(
  request: Request,
  context: { params: Promise<{ canal: string }> }
) {
  try {
    const { canal } = await context.params;

    const corpo = await request.json();

    const servico = getIntegracaoMarketplaceService();

    if (typeof corpo?.cancelarPedidoExterno === "string") {
      const resultado = await servico.simularCancelamento(canal, corpo.cancelarPedidoExterno);

      return NextResponse.json({ sucesso: true, ...resultado });
    }

    const itens = Array.isArray(corpo?.itens)
      ? corpo.itens.map((item: Record<string, unknown>) => ({
          codigoItemExterno: String(item?.codigoItemExterno ?? "").trim(),
          nome: String(item?.nome ?? "").trim(),
          quantidade: Number(item?.quantidade),
          precoUnitario: Number(String(item?.precoUnitario ?? "").replace(",", ".")),
          observacao: typeof item?.observacao === "string" ? item.observacao : undefined,
        }))
      : [];

    if (itens.some((item: { codigoItemExterno: string; nome: string; quantidade: number }) => !item.codigoItemExterno || !item.nome || !(item.quantidade > 0))) {
      throw new Error("Cada item precisa de código, nome e quantidade.");
    }

    const resultado = await servico.simularPedido(canal, {
      itens,
      codigoExibicao: typeof corpo?.codigoExibicao === "string" ? corpo.codigoExibicao : undefined,
      nomeCliente: typeof corpo?.nomeCliente === "string" ? corpo.nomeCliente : undefined,
      totalDaPlataforma:
        corpo?.totalDaPlataforma === undefined || corpo?.totalDaPlataforma === ""
          ? undefined
          : Number(String(corpo.totalDaPlataforma).replace(",", ".")),
    });

    return NextResponse.json({ sucesso: true, ...resultado });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível simular.");
  }
}
