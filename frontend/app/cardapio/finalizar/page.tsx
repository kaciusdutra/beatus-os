import FinalizarPedido from "@/modules/checkout/components/FinalizarPedido";

import { lerLinkDoCarrinho } from "@/modules/site/services/linkDoCarrinho";

import type { ItemDoCarrinho } from "@/modules/site/services/carrinho";

import { cardapioDaPagina } from "@/modules/site/services/server/cardapioDaPagina";

export const metadata = {
  title: "Finalizar pedido",
};

export default async function FinalizarPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { categorias, funcionamento } = await cardapioDaPagina();

  const { c } = await searchParams;

  // Link da Beatriz: os itens vêm do link, com nome e preço do cardápio de agora (o link não carrega preço).
  const link = lerLinkDoCarrinho(typeof c === "string" ? c : undefined);

  let itensDoLink: ItemDoCarrinho[] | undefined;

  let avisoDoLink = "";

  if (link) {
    const noCardapio = new Map(categorias.flatMap((categoria) => categoria.itens).map((item) => [item.id, item]));

    itensDoLink = link.itens.flatMap((item) => {
      const produto = noCardapio.get(item.produtoId);

      return produto ? [{ id: produto.id, nome: produto.nome, preco: produto.preco, quantidade: item.quantidade }] : [];
    });

    if (itensDoLink.length < link.itens.length) {
      avisoDoLink = "Algum item do link não está mais disponível no cardápio e ficou de fora.";
    }
  }

  return (
    <FinalizarPedido
      recebePedidos={funcionamento.recebePedidos}
      textoDeFuncionamento={funcionamento.texto}
      itensDoLink={itensDoLink}
      origem={link?.origem ?? "CARDAPIO_ONLINE"}
      telefoneDoLink={link?.telefone}
      avisoDoLink={avisoDoLink}
    />
  );
}
