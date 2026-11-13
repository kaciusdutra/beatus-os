export type TipoDeMovimento = "ENTRADA" | "SAIDA";

export type OrigemDoMovimento = "PEDIDO" | "COMPRA" | "LANCAMENTO" | "TITULO";

// Pagamento aprovado de um pedido (entrada do caixa).
export interface PagamentoRecebido {
  id: string;
  pedidoId: string;
  numero: string;
  canal: string;
  forma: string;
  valor: number;
  data: string;
}

// Compra confirmada e paga à vista (saída do caixa).
export interface CompraPaga {
  id: string;
  numeroDocumento?: string;
  fornecedor: string;
  valorTotal: number;
  forma?: string;
  data: string;
  itensPorDestino: { destino: string; valor: number }[];
}

// Lançamento manual (despesa ou receita avulsa).
export interface LancamentoManual {
  id: string;
  tipo: TipoDeMovimento;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  forma?: string;
  observacao?: string;
  cancelado: boolean;
  motivoCancelamento?: string;
}

export interface NovoLancamento {
  tipo: TipoDeMovimento;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  forma?: string;
  observacao?: string;
}

export interface MovimentoDeCaixa {
  id: string;
  data: string;
  tipo: TipoDeMovimento;
  origem: OrigemDoMovimento;
  categoria: string;
  descricao: string;
  valor: number;
  forma?: string;
  canal?: string;
  referenciaId?: string;
  referenciaNumero?: string;
}

export interface TotalPorChave {
  chave: string;
  valor: number;
}

export interface FluxoDeCaixa {
  de: string;
  ate: string;
  movimentos: MovimentoDeCaixa[];
  entradas: number;
  saidas: number;
  saldo: number;
  entradasPorCanal: TotalPorChave[];
  entradasPorForma: TotalPorChave[];
  saidasPorCategoria: TotalPorChave[];
  // Só quando o período é um mês inteiro (regra 7.6: o mês conta inteiro).
  custosFixosPrevistos?: number;
  saldoComPrevisto?: number;
}

export const FORMAS_DE_LANCAMENTO = ["PIX", "DINHEIRO", "CARTAO"];

export const CATEGORIAS_DE_SAIDA = [
  "Gás",
  "Energia",
  "Água",
  "Internet",
  "Manutenção",
  "Combustível",
  "Taxas e tarifas",
  "Impostos",
  "Pró-labore",
  "Mão de obra",
  "Marketing",
  "Outras despesas",
];

export const CATEGORIAS_DE_ENTRADA = [
  "Aporte do sócio",
  "Troco / ajuste de caixa",
  "Outras receitas",
];
