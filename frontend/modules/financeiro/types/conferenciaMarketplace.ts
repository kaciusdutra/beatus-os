export type StatusDaConferencia = "AGUARDANDO" | "CONFERIDO";

export interface PedidoDoMarketplace {
  id: string;
  numero: string;
  canal: string;
  codigoExterno: string;
  nomeClienteExterno?: string;
  criadoEm: string;
  total: number;
  comissaoEsperada: number;
  // O que a plataforma deve repassar: total menos a comissão do canal.
  liquidoEsperado: number;
  status: StatusDaConferencia;
  valorRecebido?: number;
  // Recebido menos esperado (negativo = a plataforma pagou menos)
  diferenca?: number;
  // AAAA-MM-DD em que o repasse foi recebido
  recebidoEm?: string;
  observacao?: string;
  // Pedido cancelado na cozinha: não há repasse a conferir.
  cancelado: boolean;
}

export interface ConferenciaDoMarketplace {
  aguardando: { quantidade: number; esperado: number };
  conferidos: { quantidade: number; esperado: number; recebido: number; diferenca: number };
}

export interface ConferirPedido {
  valorRecebido: number;
  // AAAA-MM-DD
  recebidoEm: string;
  observacao?: string;
}
