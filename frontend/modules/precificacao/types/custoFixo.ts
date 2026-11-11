// Custo fixo mensal (regra 7.6): mão de obra, gás, energia, aluguel,
// internet, hospedagem do site, tráfego pago.
export interface CustoFixo {
  id: string;

  nome: string;

  valorMensal: number;

  inicioVigencia: string;

  fimVigencia?: string;

  ativo: boolean;

  observacao?: string;

  criadoEm: string;

  atualizadoEm: string;
}

// Base do rateio por pedido (regra 7.6).
export interface ConfiguracaoPrecificacao {
  pedidosMensaisEstimados: number;
}

export interface ResumoCustosFixos {
  // Soma dos custos ativos e vigentes na data.
  totalMensal: number;

  pedidosMensaisEstimados: number;

  // Indefinido enquanto não houver estimativa de pedidos.
  custoPorPedido?: number;
}
