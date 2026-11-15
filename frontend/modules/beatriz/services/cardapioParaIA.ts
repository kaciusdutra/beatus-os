import {
  precoNoCanal,
  type PrecoDoCatalogo,
} from "@/modules/pedidos/services/calcularPedido";

import type { CanalPedido } from "@/modules/pedidos/types/pedido";

export interface ItemDoCardapioIA {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  preco: number;
  // Adicional só se pede junto de um produto.
  adicional: boolean;
}

// O cardápio que a Beatriz enxerga: só o que está ativo e tem preço no canal
// (o mesmo critério do pedido). O que não está aqui, ela não pode oferecer.
export function montarCardapioParaIA(
  produtos: { id: string; nome: string; descricao: string; categoria: string; ativo: boolean }[],
  precos: PrecoDoCatalogo[],
  canal: CanalPedido
): ItemDoCardapioIA[] {
  const itens: ItemDoCardapioIA[] = [];

  for (const produto of produtos) {
    if (!produto.ativo) {
      continue;
    }

    const preco = precoNoCanal(canal, produto.id, precos);

    if (preco === undefined) {
      continue;
    }

    itens.push({
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao,
      categoria: produto.categoria,
      preco,
      adicional: produto.categoria.trim().toUpperCase() === "ADICIONAL",
    });
  }

  return itens.sort(
    (a, b) =>
      Number(a.adicional) - Number(b.adicional) ||
      a.categoria.localeCompare(b.categoria, "pt-BR") ||
      a.nome.localeCompare(b.nome, "pt-BR")
  );
}

function reais(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

// O cardápio em texto para o prompt. O preço aparece para a IA só como
// contexto: as instruções a proíbem de citar valores ao cliente.
export function cardapioEmTexto(cardapio: ItemDoCardapioIA[]): string {
  if (cardapio.length === 0) {
    return "(o cardápio está vazio no momento)";
  }

  const linhas = (itens: ItemDoCardapioIA[]) =>
    itens
      .map(
        (item) =>
          `- id: ${item.id} | ${item.nome} | ${item.categoria} | R$ ${reais(item.preco)}${item.descricao ? ` | ${item.descricao}` : ""}`
      )
      .join("\n");

  const principais = cardapio.filter((item) => !item.adicional);

  const adicionais = cardapio.filter((item) => item.adicional);

  return (
    `PRODUTOS:\n${linhas(principais) || "(nenhum)"}` +
    `\n\nADICIONAIS (só se pedem junto de um produto):\n${linhas(adicionais) || "(nenhum)"}`
  );
}
