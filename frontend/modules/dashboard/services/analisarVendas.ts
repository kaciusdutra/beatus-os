import type { PedidoParaDashboard } from "../types/dashboard";

import type {
  CanalAnalisado,
  EtiquetaDoProduto,
  MargemDoPreco,
  ProdutoAnalisado,
  VendaDoProdutoNoCanal,
} from "../types/analiseDeVendas";

// Quantos pontos acima da margem mínima um produto precisa ter para ser
// sugerido para divulgação.
export const FOLGA_PARA_DIVULGAR = 10;

const QUANTOS_MAIS_VENDIDOS = 3;

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function mediana(valores: number[]): number {
  if (valores.length === 0) {
    return 0;
  }

  const ordenados = [...valores].sort((a, b) => a - b);

  const meio = Math.floor(ordenados.length / 2);

  return ordenados.length % 2 === 0
    ? (ordenados[meio - 1] + ordenados[meio]) / 2
    : ordenados[meio];
}

export function analisarCanais(pedidos: PedidoParaDashboard[]): CanalAnalisado[] {
  const validos = pedidos.filter((pedido) => pedido.status !== "CANCELADO");

  const total = validos.reduce((soma, pedido) => soma + pedido.total, 0);

  const mapa = new Map<string, { pedidos: number; valor: number }>();

  for (const pedido of validos) {
    const atual = mapa.get(pedido.canal) ?? { pedidos: 0, valor: 0 };

    atual.pedidos += 1;
    atual.valor += pedido.total;

    mapa.set(pedido.canal, atual);
  }

  return [...mapa.entries()]
    .map(([canal, dados]) => ({
      canal,
      pedidos: dados.pedidos,
      valor: arredondar(dados.valor),
      ticketMedio: arredondar(dados.valor / dados.pedidos),
      percentual: total > 0 ? Math.round((dados.valor / total) * 100) : 0,
    }))
    .sort((a, b) => b.valor - a.valor);
}

// Produto por canal: o que vende, quanto rende e a margem do preço praticado.
// Etiquetas (critérios abertos na tela, regra 14.8):
//  - MAIS_VENDIDO: os 3 que mais faturam;
//  - REVER_MARGEM: vende em algum canal com margem abaixo da mínima;
//  - DIVULGAR: margem conhecida bem acima da mínima (folga) e venda abaixo da
//    mediana dos produtos vendidos.
export function analisarProdutos(
  pedidos: PedidoParaDashboard[],
  margens: MargemDoPreco[],
  margemMinima: number
): ProdutoAnalisado[] {
  const produtos = new Map<
    string,
    { nome: string; porCanal: Map<string, { unidades: number; valor: number }> }
  >();

  for (const pedido of pedidos) {
    if (pedido.status === "CANCELADO") {
      continue;
    }

    for (const item of pedido.itens) {
      if (!item.produtoId) {
        continue;
      }

      const produto =
        produtos.get(item.produtoId) ?? { nome: item.nome, porCanal: new Map() };

      const canal = produto.porCanal.get(pedido.canal) ?? { unidades: 0, valor: 0 };

      canal.unidades += item.quantidade;
      canal.valor += item.subtotal;

      produto.porCanal.set(pedido.canal, canal);

      produtos.set(item.produtoId, produto);
    }
  }

  const margemDe = (produtoId: string, canal: string): number | undefined =>
    margens.find((margem) => margem.produtoId === produtoId && margem.canal === canal)
      ?.margemPercentual;

  // O canal do pedido de PDV, WhatsApp e cardápio usa o preço do site.
  const margemNoCanal = (produtoId: string, canal: string): number | undefined =>
    margemDe(produtoId, canal) ??
    (["PDV", "CARDAPIO_ONLINE", "WHATSAPP"].includes(canal)
      ? margemDe(produtoId, "SITE")
      : undefined);

  const linhas: ProdutoAnalisado[] = [...produtos.entries()].map(([produtoId, produto]) => {
    const porCanal: VendaDoProdutoNoCanal[] = [...produto.porCanal.entries()]
      .map(([canal, dados]) => ({
        canal,
        unidades: dados.unidades,
        valor: arredondar(dados.valor),
        margemPercentual: margemNoCanal(produtoId, canal),
      }))
      .sort((a, b) => b.valor - a.valor);

    return {
      produtoId,
      nome: produto.nome,
      unidades: porCanal.reduce((soma, canal) => soma + canal.unidades, 0),
      valor: arredondar(porCanal.reduce((soma, canal) => soma + canal.valor, 0)),
      porCanal,
      etiquetas: [],
      motivos: [],
    };
  });

  linhas.sort((a, b) => b.valor - a.valor || b.unidades - a.unidades);

  const medianaDeUnidades = mediana(linhas.map((linha) => linha.unidades));

  linhas.forEach((linha, indice) => {
    const etiquetas: EtiquetaDoProduto[] = [];

    if (indice < QUANTOS_MAIS_VENDIDOS && linha.valor > 0) {
      etiquetas.push("MAIS_VENDIDO");

      linha.motivos.push(`${indice + 1}º em faturamento no período.`);
    }

    const abaixo = linha.porCanal.filter(
      (canal) => canal.margemPercentual !== undefined && canal.margemPercentual < margemMinima
    );

    if (abaixo.length > 0) {
      etiquetas.push("REVER_MARGEM");

      linha.motivos.push(
        `Margem abaixo da mínima (${margemMinima}%) em ${abaixo
          .map((canal) => `${canal.canal} (${canal.margemPercentual}%)`)
          .join(", ")}: rever o preço antes de promover.`
      );
    }

    const conhecidas = linha.porCanal
      .map((canal) => canal.margemPercentual)
      .filter((margem): margem is number => margem !== undefined);

    const melhorCaso =
      conhecidas.length > 0 &&
      Math.min(...conhecidas) >= margemMinima + FOLGA_PARA_DIVULGAR &&
      linhas.length >= 3 &&
      linha.unidades <= medianaDeUnidades;

    if (melhorCaso) {
      etiquetas.push("DIVULGAR");

      linha.motivos.push(
        `Margem de ${Math.min(...conhecidas)}% ou mais e venda abaixo da mediana (${linha.unidades} un.): bom para divulgar ou promover.`
      );
    }

    linha.etiquetas = etiquetas;
  });

  return linhas;
}
