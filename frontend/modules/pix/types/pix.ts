import type { TipoDeChavePix } from "../services/gerarPix";

export interface ConfiguracaoDoPix {
  chave?: string;
  tipoDaChave?: TipoDeChavePix;
  nomeRecebedor?: string;
  cidade?: string;
  // Tudo preenchido: dá para gerar cobrança.
  configurado: boolean;
}

export interface CobrancaPix {
  copiaECola: string;
  valor: number;
  txid: string;
  recebedor: { nome: string; cidade: string };
}
