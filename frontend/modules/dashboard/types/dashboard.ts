// Pedido como o dashboard o lê (sem o que não interessa a ele).
export interface PedidoParaDashboard {
  status: string;
  canal: string;
  total: number;
  criadoEm: string;
  itens: {
    produtoId?: string;
    nome: string;
    quantidade: number;
    subtotal: number;
  }[];
}

export interface VendaPorCanal {
  canal: string;
  pedidos: number;
  valor: number;
  // % do faturamento do dia
  percentual: number;
}

export interface ProdutoDoRanking {
  nome: string;
  quantidade: number;
  valor: number;
}

export interface EmOperacao {
  novos: number;
  emPreparo: number;
  prontos: number;
  emRota: number;
  total: number;
}

export interface AlertaDoDashboard {
  nivel: "CRITICO" | "ATENCAO" | "INFO";
  mensagem: string;
  // Tela onde o assunto se resolve.
  href?: string;
}

export interface DashboardDados {
  // AAAA-MM-DD
  hoje: string;

  // Hoje, sem os pedidos cancelados.
  pedidosHoje: number;
  cancelados: number;
  entregues: number;
  faturamento: number;
  ticketMedio: number;

  // Pedidos ainda em andamento (de qualquer dia).
  emOperacao: EmOperacao;

  vendasPorCanal: VendaPorCanal[];

  // Dias considerados no ranking.
  diasDoRanking: number;
  rankingProdutos: ProdutoDoRanking[];

  alertas: AlertaDoDashboard[];

  atualizadoEm: string;
}
