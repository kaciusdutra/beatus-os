export type TipoDocumentoEntradaCompraArquivo =
  | "NOTA_FISCAL"
  | "RECIBO"
  | "COMPROVANTE"
  | "OUTRO";

export type OrigemDocumentoEntradaCompra =
  | "FOTOGRAFIA"
  | "UPLOAD"
  | "XML"
  | "IMPORTACAO";

export type StatusLeituraDocumentoEntradaCompra =
  | "PENDENTE"
  | "PROCESSANDO"
  | "EXTRAIDO"
  | "ERRO";

export interface EntradaCompraDocumento {
  id: string;
  entradaCompraId: string;

  nomeArquivo: string;
  mimeType: string;
  tamanho: number;

  tipoDocumento: TipoDocumentoEntradaCompraArquivo;
  origem: OrigemDocumentoEntradaCompra;
  statusLeitura: StatusLeituraDocumentoEntradaCompra;

  caminhoArquivo: string;
  hashArquivo?: string;

  criadoEm: string;
  atualizadoEm: string;
}