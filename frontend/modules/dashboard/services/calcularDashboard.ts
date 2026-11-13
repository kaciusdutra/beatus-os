import type {
  EmOperacao,
  PedidoParaDashboard,
  ProdutoDoRanking,
  VendaPorCanal,
} from "../types/dashboard";

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export interface ResumoDoDia {
  pedidosHoje: number;
  cancelados: number;
  entregues: number;
  faturamento: number;
  ticketMedio: number;
  vendasPorCanal: VendaPorCanal[];
}

// Resumo de um dia de vendas. Pedido cancelado não entra no faturamento, no
// ticket médio nem na quantidade; é contado à parte.
export function resumirDia(pedidos: PedidoParaDashboard[]): ResumoDoDia {
  const validos = pedidos.filter((pedido) => pedido.status !== "CANCELADO");

  const faturamento = arredondar(validos.reduce((soma, pedido) => soma + pedido.total, 0));

  const porCanal = new Map<string, { pedidos: number; valor: number }>();

  for (const pedido of validos) {
    const atual = porCanal.get(pedido.canal) ?? { pedidos: 0, valor: 0 };

    atual.pedidos += 1;
    atual.valor += pedido.total;

    porCanal.set(pedido.canal, atual);
  }

  return {
    pedidosHoje: validos.length,
    cancelados: pedidos.length - validos.length,
    entregues: validos.filter((pedido) => pedido.status === "ENTREGUE").length,
    faturamento,
    ticketMedio: validos.length > 0 ? arredondar(faturamento / validos.length) : 0,
    vendasPorCanal: [...porCanal.entries()]
      .map(([canal, dados]) => ({
        canal,
        pedidos: dados.pedidos,
        valor: arredondar(dados.valor),
        percentual: faturamento > 0 ? Math.round((dados.valor / faturamento) * 100) : 0,
      }))
      .sort((a, b) => b.valor - a.valor),
  };
}

// Produtos mais vendidos (por faturamento) entre os pedidos não cancelados.
// Só entram linhas de produto; os adicionais (sem produto) ficam de fora.
export function rankearProdutos(
  pedidos: PedidoParaDashboard[],
  limite = 5
): ProdutoDoRanking[] {
  const mapa = new Map<string, ProdutoDoRanking>();

  for (const pedido of pedidos) {
    if (pedido.status === "CANCELADO") {
      continue;
    }

    for (const item of pedido.itens) {
      if (!item.produtoId) {
        continue;
      }

      const atual = mapa.get(item.produtoId) ?? { nome: item.nome, quantidade: 0, valor: 0 };

      atual.quantidade += item.quantidade;
      atual.valor += item.subtotal;

      mapa.set(item.produtoId, atual);
    }
  }

  return [...mapa.values()]
    .map((produto) => ({ ...produto, valor: arredondar(produto.valor) }))
    .sort((a, b) => b.valor - a.valor || b.quantidade - a.quantidade)
    .slice(0, limite);
}

export function montarEmOperacao(contagem: Record<string, number>): EmOperacao {
  const novos = contagem.NOVO ?? 0;

  const emPreparo = contagem.EM_PREPARO ?? 0;

  const prontos = contagem.PRONTO ?? 0;

  const emRota = contagem.EM_ROTA ?? 0;

  return { novos, emPreparo, prontos, emRota, total: novos + emPreparo + prontos + emRota };
}

// Mensagem de uma linha para o cartão do assistente.
export function analisarDashboard(dados: {
  pedidosHoje: number;
  emOperacao: EmOperacao;
  novosParados?: number;
}): { mensagem: string; nivel: "info" | "warning" | "danger" } {
  if ((dados.novosParados ?? 0) > 0) {
    return {
      mensagem: `${dados.novosParados} pedido(s) novo(s) esperando há mais de 10 minutos na fila da cozinha.`,
      nivel: "warning",
    };
  }

  if (dados.emOperacao.emPreparo > 10) {
    return { mensagem: "A cozinha está sobrecarregada.", nivel: "warning" };
  }

  if (dados.pedidosHoje === 0 && dados.emOperacao.total === 0) {
    return { mensagem: "Nenhum pedido recebido até o momento.", nivel: "info" };
  }

  return { mensagem: "Operação funcionando normalmente.", nivel: "info" };
}
