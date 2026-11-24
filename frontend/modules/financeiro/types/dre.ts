// DRE do mês (regra 12.11): resultado por competência, pela data do pedido.

export interface PedidoParaDre {
  canal: string;
  status: string;
  subtotal: number;
  descontos: number;
  taxaEntrega: number;
  total: number;
  // Só marketplace
  comissaoEsperada?: number;
  // Taxa real informada pelo gateway (Mercado Pago); ausente = ainda não informada ou pagamento manual.
  taxaDoGateway?: number;
  pagoPorGateway?: boolean;
}

// Uma baixa (ou devolução) de estoque por venda, já valorizada. valor > 0 = custo; valor < 0 = devolvido ao estoque.
export interface CustoDeBaixa {
  valor: number | null;
}

export interface EntradaDaDre {
  mes: string;
  pedidos: PedidoParaDre[];
  baixas: CustoDeBaixa[];
  impostoPercentual: number;
  custosFixosDoMes: number;
}

export interface Dre {
  mes: string;
  pedidos: number;
  cancelados: number;
  receita: { produtos: number; descontos: number; entrega: number; total: number };
  deducoes: { comissoes: number; taxasDoGateway: number; impostos: number; total: number };
  receitaLiquida: number;
  cmv: { total: number; baixasSemCusto: number };
  lucroBruto: number;
  custosFixos: number;
  resultado: number;
  // Em % da receita total (nulo sem receita)
  margemBruta: number | null;
  margemDoResultado: number | null;
  semTaxaDoGateway: number;
  avisos: string[];
}
