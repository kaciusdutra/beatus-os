
import {
  EntradaCompraDocumento,
} from "./entradaCompraDocumento";

import {
  DestinoItemCompra,
} from "../domain/destinoItemCompra";

export type StatusEntradaCompra =
  | "RASCUNHO"
  | "CONFIRMADA"
  | "CANCELADA";

export type TipoDocumentoEntradaCompra =
  | "NOTA_FISCAL"
  | "RECIBO"
  | "COMPROVANTE"
  | "OUTRO";

export interface EntradaCompraItem {
  id: string;

  entradaCompraId: string;

  descricaoOriginal: string;

  codigoFornecedor?: string;

  quantidade: number;

  unidade: string;

  valorUnitario: number;

  desconto: number;

  valorTotal: number;

  lote?: string;

  validade?: string;

  observacao?: string;

  // Vazio = item ainda não classificado.
  destino?: DestinoItemCompra;

  // Ligação com o insumo da ficha técnica: será feita na G08 (vazia por enquanto).
  insumoId?: string;

  // Quanto a compra vale na unidade de compra do insumo (bloco 8C).
  quantidadeConvertida?: number;

  unidadeConvertida?: string;

  // Quantidade real informada na entrada (ex.: 6,8 kg de 3 mantas). Tem prioridade no custo.
  quantidadeReal?: number;

  unidadeReal?: string;

  criadoEm: string;

  atualizadoEm: string;
}

export interface ClassificacaoItemInput {
  itemId: string;

  // null limpa a classificação do item.
  destino: DestinoItemCompra | null;

  // Peso real (bloco do peso real): undefined não mexe; null limpa.
  quantidadeReal?: number | null;

  unidadeReal?: string | null;

  // true = lembrar "1 unidade do item = quantidadeReal/quantidade unidadeReal".
  lembrarFator?: boolean;
}

// Memória (regra 9.13): chave do item do fornecedor -> destino.
export interface MemoriaClassificacaoItemCompra {
  fornecedorId: string;

  descricaoNormalizada: string;

  destino: DestinoItemCompra;

  // Insumo ligado a este item do fornecedor (bloco 8A); vazio = ainda sem insumo.
  insumoId?: string;

  // Fator fixo lembrado: 1 unidade do item = fatorQuantidade fatorUnidade.
  fatorQuantidade?: number;

  fatorUnidade?: string;
}

// Registro da memória como está no banco (usado na tela de vínculos).
export interface MemoriaClassificacaoRegistro
  extends MemoriaClassificacaoItemCompra {
  id: string;

  vezesUsada: number;
}

// Item de compra de um fornecedor, com o insumo ligado (ou não) e a última compra.
export interface VinculoItemCompra {
  // Id da memória do fornecedor (é com ele que se liga o insumo).
  id: string;

  fornecedorId: string;

  descricaoNormalizada: string;

  // Descrição como veio na nota mais recente.
  descricao: string;

  destino: DestinoItemCompra;

  vezesUsada: number;

  insumoId?: string;

  ultimaCompra?: {
    entradaId: string;

    numeroDocumento?: string;

    dataEntrada: string;

    quantidade: number;

    unidade: string;

    valorUnitario: number;

    desconto: number;
  };
}

export type OrigemSugestaoClassificacao =
  | "MEMORIA"
  | "PADRAO_FORNECEDOR";

// Como cada item da entrada foi identificado.
export interface IdentificacaoItemCompra {
  itemId: string;

  // Chave do item do fornecedor (regra 9.13).
  chave: string;

  // true = o fornecedor já vendeu este item numa entrada confirmada.
  conhecido: boolean;

  // Preenchidos só para itens ainda sem destino.
  destinoSugerido?: DestinoItemCompra;

  origem?: OrigemSugestaoClassificacao;

  // Fator fixo lembrado para este item do fornecedor.
  fator?: {
    quantidade: number;
    unidade: string;
  };
}

export interface EntradaCompra {
  id: string;

  fornecedorId: string;

  tipoDocumento: TipoDocumentoEntradaCompra;

  status: StatusEntradaCompra;

  numeroDocumento?: string;

  serie?: string;

  chaveAcesso?: string;

  dataDocumento?: string;

  dataEntrada: string;

  valorProdutos: number;

  valorDesconto: number;

  valorFrete: number;

  // Impostos e outras despesas da nota: ficam à parte, fora do custo (regra 7.25).
  valorIcmsSt?: number;

  valorIpi?: number;

  valorSeguro?: number;

  valorOutrasDespesas?: number;

  valorTotal: number;

  documentoArquivo?: string;

  observacao?: string;

  itens: EntradaCompraItem[];

  criadoEm: string;

  atualizadoEm: string;

  documentos:
  EntradaCompraDocumento[];

  // Só na resposta de confirmar, cancelar e recalcular (não é gravado).
  avisosCusto?: string[];
}

// Uma compra confirmada na história do custo do insumo (bloco 8C).
export interface HistoricoPrecoInsumoRegistro {
  id: string;

  insumoId: string;

  entradaCompraItemId: string;

  dataCompra: string;

  precoPorUnidade: number;

  custoAnterior: number;

  criadoEm: string;
}