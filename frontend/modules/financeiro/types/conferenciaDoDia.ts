// Pedido do dia como a conferência o lê.
export interface PedidoDoDia {
  canal: string;
  status: string;
  total: number;
  // Soma dos pagamentos aprovados do pedido
  pagamentoAprovado: number;
  // Só pedido de marketplace
  comissaoEsperada?: number;
  liquidoEsperado?: number;
  conferenciaStatus?: string;
  valorRecebido?: number;
}

export type TipoDeCanal = "PROPRIO" | "MARKETPLACE";

export type SituacaoDoCanal = "BATE" | "DIFERENCA" | "AGUARDANDO" | "CONFERIDO";

export interface LinhaDoCanal {
  canal: string;
  tipo: TipoDeCanal;
  pedidos: number;
  cancelados: number;
  valorCancelado: number;
  // Total dos pedidos do dia, sem os cancelados
  vendido: number;
  // Canal próprio: pagamentos aprovados. Marketplace: repasses já conferidos.
  entrou: number;
  // Marketplace: o que ainda falta chegar (líquido esperado dos não conferidos)
  aReceber: number;
  pedidosAguardando: number;
  // Marketplace: comissão da plataforma
  comissao: number;
  // Entrou menos o esperado (negativo = faltou dinheiro)
  diferenca: number;
  situacao: SituacaoDoCanal;
}

export interface ConferenciaDoDia {
  // AAAA-MM-DD
  data: string;
  canais: LinhaDoCanal[];
  totais: {
    pedidos: number;
    cancelados: number;
    vendido: number;
    entrou: number;
    aReceber: number;
    comissoes: number;
    diferenca: number;
  };
  // vendido = entrou + a receber + comissões − diferença. Sempre fecha; se não
  // fechar, há erro nos dados.
  fecha: boolean;
}
