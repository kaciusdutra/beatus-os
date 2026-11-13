export type TipoDeTitulo = "BOLETO" | "DUPLICATA" | "OUTRO";

export const TIPOS_DE_TITULO: TipoDeTitulo[] = ["BOLETO", "DUPLICATA", "OUTRO"];

export type StatusDoTitulo = "ABERTO" | "PAGO" | "CANCELADO";

// VENCIDO e VENCE_HOJE são calculados: título aberto com vencimento passado ou de hoje.
export type SituacaoDoTitulo =
  | "ABERTO"
  | "VENCE_HOJE"
  | "VENCIDO"
  | "PAGO"
  | "CANCELADO";

// Datas de vencimento e pagamento: AAAA-MM-DD.
export interface ContaPagar {
  id: string;
  entradaCompraId?: string;
  fornecedorId: string;
  fornecedor: string;
  tipo: TipoDeTitulo;
  numeroDocumento?: string;
  parcela: number;
  totalParcelas: number;
  valor: number;
  vencimento: string;
  status: StatusDoTitulo;
  pagoEm?: string;
  valorPago?: number;
  formaPagamento?: string;
  observacao?: string;
  motivoCancelamento?: string;
  criadoEm: string;
}

export interface NovoTitulo {
  tipo: TipoDeTitulo;
  numeroDocumento?: string;
  valor: number;
  vencimento: string;
  observacao?: string;
}

export interface PagamentoDeTitulo {
  pagoEm: string;
  valorPago: number;
  forma: string;
}

// Título pago, para o fluxo de caixa (saída na data do pagamento).
export interface TituloPago {
  id: string;
  fornecedor: string;
  numeroDocumento?: string;
  parcela: number;
  totalParcelas: number;
  valor: number;
  valorPago: number;
  pagoEm: string;
  forma?: string;
  entradaCompraId?: string;
  // Para repartir a saída pelos destinos da compra de origem.
  compraValorTotal?: number;
  compraItensPorDestino?: { destino: string; valor: number }[];
}

export type NivelDeAlerta = "CRITICO" | "ATENCAO" | "INFO";

export interface AlertaDeGiro {
  nivel: NivelDeAlerta;
  codigo: string;
  mensagem: string;
}

export interface DiaDaProjecao {
  data: string;
  vendasEsperadas: number;
  titulosAPagar: number;
  custosFixos: number;
  saldo: number;
}

export interface FaixaDeTitulos {
  quantidade: number;
  valor: number;
}

export interface CapitalDeGiro {
  hoje: string;
  // Nulo enquanto o saldo inicial do caixa não for informado.
  saldoAtual: number | null;
  totalEmAberto: FaixaDeTitulos;
  vencidos: FaixaDeTitulos;
  venceHoje: FaixaDeTitulos;
  ate7Dias: FaixaDeTitulos;
  ate15Dias: FaixaDeTitulos;
  ate30Dias: FaixaDeTitulos;
  projecao: DiaDaProjecao[];
  primeiroDiaNegativo?: { data: string; saldo: number };
  menorSaldo?: { data: string; saldo: number };
  // Média, em dias, entre a compra e o vencimento dos títulos.
  prazoMedioDias?: number;
  alertas: AlertaDeGiro[];
}

export interface ConfiguracaoFinanceira {
  saldoInicial: number;
  // AAAA-MM-DD: a partir deste dia o sistema soma as entradas e subtrai as saídas.
  saldoInicialEm?: string;
}
