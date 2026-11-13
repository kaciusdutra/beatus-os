export type ItemDeEstoque = "INSUMO" | "PREPARACAO";

export type TipoDeMovimento =
  | "ENTRADA_COMPRA"
  | "ESTORNO_COMPRA"
  | "PRODUCAO_CONSUMO"
  | "PRODUCAO_ENTRADA"
  | "BAIXA_VENDA"
  | "ESTORNO_VENDA"
  | "AJUSTE_CONTAGEM"
  | "PERDA";

export const ROTULO_DO_MOVIMENTO: Record<TipoDeMovimento, string> = {
  ENTRADA_COMPRA: "Entrada de compra",
  ESTORNO_COMPRA: "Compra cancelada",
  PRODUCAO_CONSUMO: "Usado na produção",
  PRODUCAO_ENTRADA: "Produzido",
  BAIXA_VENDA: "Venda",
  ESTORNO_VENDA: "Devolvido ao estoque",
  AJUSTE_CONTAGEM: "Ajuste de contagem",
  PERDA: "Perda",
};

export interface SaldoDeEstoque {
  itemTipo: ItemDeEstoque;

  id: string;

  nome: string;

  categoria?: string;

  unidade: string;

  saldo: number;

  minimo?: number;

  // Custo por unidade e valor parado em estoque (saldo positivo × custo).
  custoUnitario?: number;

  valor?: number;

  abaixoDoMinimo: boolean;
}

export interface MovimentoListado {
  id: string;

  tipo: TipoDeMovimento;

  quantidade: number;

  unidade: string;

  motivo?: string;

  criadoEm: string;
}

export interface LoteDeProducao {
  id: string;

  fichaTecnicaId: string;

  nome: string;

  quantidadePlanejada: number;

  quantidadeProduzida: number;

  unidade: string;

  custoUnitario?: number;

  validade?: string;

  observacao?: string;

  criadoEm: string;
}

export interface PrevisaoDeProducao {
  consumos: {
    itemTipo: ItemDeEstoque;
    id: string;
    nome: string;
    quantidade: number;
    unidade: string;
    saldoAtual: number;
    saldoDepois: number;
  }[];

  avisos: string[];
}
