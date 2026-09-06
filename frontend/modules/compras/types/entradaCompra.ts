
import {
  EntradaCompraDocumento,
} from "./entradaCompraDocumento";

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

  criadoEm: string;

  atualizadoEm: string;
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