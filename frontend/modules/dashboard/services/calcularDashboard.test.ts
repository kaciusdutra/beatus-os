import {
  analisarDashboard,
  montarEmOperacao,
  rankearProdutos,
  resumirDia,
} from "./calcularDashboard";

import type { PedidoParaDashboard } from "../types/dashboard";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function pedido(
  status: string,
  canal: string,
  total: number,
  itens: PedidoParaDashboard["itens"] = []
): PedidoParaDashboard {
  return { status, canal, total, criadoEm: "2026-11-13T20:00:00.000Z", itens };
}

function executarTestes(): void {
  const dia = [
    pedido("ENTREGUE", "PDV", 100),
    pedido("NOVO", "IFOOD", 60),
    pedido("EM_PREPARO", "PDV", 40),
    pedido("CANCELADO", "PDV", 999),
  ];

  const resumo = resumirDia(dia);

  verificar(resumo.pedidosHoje === 3, "3 pedidos válidos");
  verificar(resumo.cancelados === 1, "1 cancelado contado à parte");
  verificar(resumo.entregues === 1, "1 entregue");
  verificar(resumo.faturamento === 200, "faturamento sem o cancelado");
  verificar(resumo.ticketMedio === 66.67, "ticket médio de 200 em 3 pedidos");
  verificar(resumo.vendasPorCanal[0].canal === "PDV" && resumo.vendasPorCanal[0].valor === 140, "PDV lidera com 140");
  verificar(resumo.vendasPorCanal[0].percentual === 70, "PDV é 70% do faturamento");
  verificar(resumo.vendasPorCanal[1].canal === "IFOOD" && resumo.vendasPorCanal[1].percentual === 30, "iFood é 30%");

  const vazio = resumirDia([]);

  verificar(vazio.faturamento === 0 && vazio.ticketMedio === 0 && vazio.vendasPorCanal.length === 0, "dia sem pedidos zera tudo");

  // Ranking
  const ranking = rankearProdutos([
    pedido("ENTREGUE", "PDV", 0, [
      { produtoId: "a", nome: "Sanctum", quantidade: 2, subtotal: 100 },
      { produtoId: "b", nome: "Batata", quantidade: 5, subtotal: 50 },
      { nome: "Bacon extra", quantidade: 9, subtotal: 90 },
    ]),
    pedido("ENTREGUE", "PDV", 0, [{ produtoId: "a", nome: "Sanctum", quantidade: 1, subtotal: 50 }]),
    pedido("CANCELADO", "PDV", 0, [{ produtoId: "c", nome: "Cancelado", quantidade: 9, subtotal: 900 }]),
  ]);

  verificar(ranking.length === 2, "adicional e cancelado ficam de fora");
  verificar(ranking[0].nome === "Sanctum" && ranking[0].quantidade === 3 && ranking[0].valor === 150, "Sanctum soma os pedidos");
  verificar(ranking[1].nome === "Batata", "Batata em segundo");
  verificar(rankearProdutos(dia, 1).length <= 1, "respeita o limite");

  // Em operação
  const operacao = montarEmOperacao({ NOVO: 2, EM_PREPARO: 1, PRONTO: 3, EM_ROTA: 1, ENTREGUE: 50 });

  verificar(operacao.total === 7, "entregue não conta como em operação");

  // Mensagem do assistente
  verificar(analisarDashboard({ pedidosHoje: 0, emOperacao: montarEmOperacao({}) }).mensagem.includes("Nenhum pedido"), "sem pedidos");
  verificar(analisarDashboard({ pedidosHoje: 5, emOperacao: operacao, novosParados: 2 }).nivel === "warning", "novos parados geram aviso");
  verificar(analisarDashboard({ pedidosHoje: 5, emOperacao: operacao }).mensagem.includes("normalmente"), "operação normal");
  verificar(analisarDashboard({ pedidosHoje: 5, emOperacao: montarEmOperacao({ EM_PREPARO: 11 }) }).mensagem.includes("sobrecarregada"), "cozinha sobrecarregada");
}

executarTestes();

console.log(`✅ Testes do dashboard passaram (${verificacoes} verificações).`);
