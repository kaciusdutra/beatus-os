import { NextResponse } from "next/server";

import { enderecoPublicoDoSite } from "@/modules/checkout/services/server/checkoutServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { montarLinkDoCarrinho } from "@/modules/site/services/linkDoCarrinho";

// Gera o link de pagamento que a Beatriz manda ao cliente: abre o checkout do site já com
// os itens do pedido e a origem WhatsApp. O link só leva o que o cliente escolheu; preço,
// entrega e total o servidor refaz no checkout.
// Corpo: { itens: [{ produtoId, quantidade, observacao?, adicionais? }], telefone? }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    if (!Array.isArray(corpo?.itens) || corpo.itens.length === 0) {
      throw new Error("O pedido precisa ter pelo menos um item.");
    }

    const itens = (corpo.itens as Record<string, unknown>[]).map((item) => {
      if (Array.isArray(item?.adicionais) && item.adicionais.length > 0) {
        throw new Error("Pedido com adicionais ainda não pode ir no link de pagamento. Lance pelo PDV.");
      }

      return {
        produtoId: typeof item?.produtoId === "string" ? item.produtoId : "",
        quantidade: typeof item?.quantidade === "number" ? item.quantidade : 0,
        observacao: typeof item?.observacao === "string" && item.observacao.trim() ? item.observacao : undefined,
      };
    });

    if (itens.some((item) => !item.produtoId || !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 20)) {
      throw new Error("Confira os itens do pedido: cada um precisa de produto e de quantidade de 1 a 20.");
    }

    const link = montarLinkDoCarrinho(enderecoPublicoDoSite(request), {
      origem: "WHATSAPP",
      telefone: typeof corpo?.telefone === "string" ? corpo.telefone : undefined,
      itens,
    });

    return NextResponse.json({ sucesso: true, link });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível gerar o link de pagamento.");
  }
}
