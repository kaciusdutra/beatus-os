import { analisarCanais, analisarProdutos } from "./analisarVendas";

import type { PedidoParaDashboard } from "../types/dashboard";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function pedido(
  canal: string,
  total: number,
  itens: PedidoParaDashboard["itens"],
  status = "ENTREGUE"
): PedidoParaDashboard {
  return { status, canal, total, criadoEm: "2026-11-13T20:00:00.000Z", itens };
}

const item = (produtoId: string, nome: string, quantidade: number, subtotal: number) => ({
  produtoId,
  nome,
  quantidade,
  subtotal,
});

function executarTestes(): void {
  const pedidos = [
    pedido("PDV", 200, [item("a", "Sanctum", 4, 200)]),
    pedido("IFOOD", 130, [item("a", "Sanctum", 2, 130)]),
    pedido("PDV", 90, [item("b", "Agnus", 3, 90)]),
    pedido("PDV", 40, [item("c", "Batata", 4, 40)]),
    pedido("PDV", 20, [item("d", "Suco", 2, 20)]),
    pedido("PDV", 999, [item("a", "Sanctum", 99, 999)], "CANCELADO"),
  ];

  // Canais
  const canais = analisarCanais(pedidos);

  verificar(canais.length === 2, "dois canais (cancelado fora)");
  verificar(canais[0].canal === "PDV" && canais[0].valor === 350 && canais[0].pedidos === 4, "PDV: 4 pedidos, R$ 350");
  verificar(canais[0].ticketMedio === 87.5, "ticket médio do PDV");
  verificar(canais[1].canal === "IFOOD" && canais[1].percentual === 27, "iFood fica com 27%");

  // Produtos, com margens: Sanctum rende bem mas tem margem baixa no iFood;
  // Batata e Suco têm margem alta.
  const margens = [
    { produtoId: "a", canal: "SITE", margemPercentual: 32 },
    { produtoId: "a", canal: "IFOOD", margemPercentual: 12 },
    { produtoId: "b", canal: "SITE", margemPercentual: 25 },
    { produtoId: "c", canal: "SITE", margemPercentual: 45 },
    { produtoId: "d", canal: "SITE", margemPercentual: 50 },
  ];

  const produtos = analisarProdutos(pedidos, margens, 20);

  verificar(produtos.length === 4, "4 produtos (cancelado fora)");
  verificar(produtos[0].nome === "Sanctum" && produtos[0].unidades === 6 && produtos[0].valor === 330, "Sanctum soma os canais");
  verificar(produtos[0].etiquetas.includes("MAIS_VENDIDO"), "Sanctum é mais vendido");
  verificar(produtos[0].etiquetas.includes("REVER_MARGEM"), "Sanctum tem margem de 12% no iFood, abaixo da mínima");
  verificar(produtos[0].porCanal.find((c) => c.canal === "PDV")?.margemPercentual === 32, "PDV usa a margem do preço do site");
  verificar(produtos[0].motivos.some((m) => m.includes("IFOOD (12%)")), "motivo cita o canal e a margem");

  // Unidades vendidas: 6, 3, 4 e 2; mediana 3,5. Só o Suco (2 un., margem 50%) está abaixo.
  const suco = produtos.find((p) => p.nome === "Suco");

  verificar(suco?.etiquetas.includes("DIVULGAR") === true, "Suco: margem 50% e venda abaixo da mediana");

  const batata = produtos.find((p) => p.nome === "Batata");

  verificar(batata?.etiquetas.includes("DIVULGAR") === false, "Batata vende acima da mediana (4 un.): não precisa de divulgação");

  const agnus = produtos.find((p) => p.nome === "Agnus");

  verificar(agnus?.etiquetas.includes("DIVULGAR") === false, "Agnus tem margem de 25%, sem folga para divulgar");
  verificar(agnus?.etiquetas.includes("MAIS_VENDIDO") === true, "Agnus é o 2º em faturamento");

  // Sem margem registrada não há etiqueta de margem
  const semMargem = analisarProdutos(pedidos, [], 20);

  verificar(semMargem.every((p) => !p.etiquetas.includes("REVER_MARGEM") && !p.etiquetas.includes("DIVULGAR")), "sem margem, só o ranking");

  // Poucos produtos: não sugere divulgação
  const poucos = analisarProdutos([pedido("PDV", 40, [item("c", "Batata", 4, 40)])], margens, 20);

  verificar(!poucos[0].etiquetas.includes("DIVULGAR"), "com menos de 3 produtos não há sugestão de divulgação");
}

executarTestes();

console.log(`✅ Testes da análise de vendas passaram (${verificacoes} verificações).`);
