
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

  criadoEm: string;

  atualizadoEm: string;
}

export interface ClassificacaoItemInput {
  itemId: string;

  // null limpa a classificação do item.
  destino: DestinoItemCompra | null;
}

// Memória (regra 9.13): chave do item do fornecedor -> destino.
export interface MemoriaClassificacaoItemCompra {
  fornecedorId: string;

  descricaoNormalizada: string;

  destino: DestinoItemCompra;
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

  valorTotal: number;

  documentoArquivo?: string;

  observacao?: string;

  itens: EntradaCompraItem[];

  criadoEm: string;

  atualizadoEm: string;

  documentos:
  EntradaCompraDocumento[];
}