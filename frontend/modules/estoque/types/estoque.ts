export type ItemDeEstoque = "INSUMO" | "PREPARACAO";

export type TipoDeMovimento =
  | "ENTRADA_COMPRA"
  | "ESTORNO_COMPRA"
  | "PRODUCAO_CONSUMO"
  | "PRODUCAO_ENTRADA"
  | "BAIXA_VENDA"
  | "ESTORNO_VENDA"
  | "AJUSTE_CONTAGEM"
  | "PERDA"
  | "TRANSFERENCIA";

export const ROTULO_DO_MOVIMENTO: Record<TipoDeMovimento, string> = {
  ENTRADA_COMPRA: "Entrada de compra",
  ESTORNO_COMPRA: "Compra cancelada",
  PRODUCAO_CONSUMO: "Usado na produção",
  PRODUCAO_ENTRADA: "Produzido",
  BAIXA_VENDA: "Venda",
  ESTORNO_VENDA: "Devolvido ao estoque",
  AJUSTE_CONTAGEM: "Ajuste de contagem",
  PERDA: "Perda",
  TRANSFERENCIA: "Mudou de lugar",
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

// Onde está uma preparação (colunas do quadro kanban do estoque).
export type LocalDoEstoque =
  | "FREEZER"
  | "GELADEIRA"
  | "DESCONGELANDO"
  | "COZINHA"
  | "SOBRA";

export const ROTULO_DO_LOCAL: Record<LocalDoEstoque, string> = {
  FREEZER: "No freezer",
  GELADEIRA: "Na geladeira",
  DESCONGELANDO: "Descongelando",
  COZINHA: "Na cozinha (hoje)",
  SOBRA: "Sobra (não recongelar)",
};

export type SituacaoDoCartao = "VENCIDO" | "VENCE_LOGO" | "OK";

export interface CartaoDoQuadro {
  chave: string;

  fichaTecnicaId: string;

  nome: string;

  unidade: string;

  producaoLoteId?: string;

  loteCodigo?: string;

  gavetaId?: string;

  gaveta?: string;

  local: LocalDoEstoque;

  quantidade: number;

  validadeAte?: string;

  descongeladoEm?: string;

  situacao: SituacaoDoCartao;
}

export interface CartaoAProduzir {
  fichaTecnicaId: string;

  nome: string;

  unidade: string;

  saldo: number;

  minimo: number;
}

export interface QuadroDoEstoque {
  cartoes: CartaoDoQuadro[];

  aProduzir: CartaoAProduzir[];
}

export interface GavetaDoEstoque {
  id: string;

  nome: string;

  fichaTecnicaId?: string;

  preparacao?: string;

  capacidade?: number;

  ativo: boolean;

  // Quanto há dentro agora (soma dos cartões no freezer ou na geladeira).
  conteudo: number;

  unidade?: string;
}

export interface RegraDeValidadeSalva {
  categoria: string;

  descricao: string;

  conservacao: string;

  temperatura: string;

  dias: number;

  fonte?: string;
}

export interface ConfiguracaoDoEstoque {
  temperaturaFreezerC?: number;

  temperaturaGeladeiraC?: number;
}

export interface DadosDaEtiqueta {
  tipo: "LOTE_CONGELADO" | "DESCONGELAMENTO" | "SOBRA" | "RESFRIADO";

  titulo: string;

  nome: string;

  loteCodigo: string;

  preparadoEm: string;

  validadeAte?: string;

  descongeladoEm?: string;

  temperatura: string;

  gaveta?: string;

  quantidade: number;

  unidade: string;

  responsavel?: string;

  avisos: string[];
}
