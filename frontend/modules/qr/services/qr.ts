// O QR da etiqueta guarda um link para a ficha do item. O link vale em qualquer
// endereço do sistema (computador, celular, hospedagem): quem lê pelo leitor do
// próprio Beatus só aproveita o caminho (/q/insumo/<id>), então um QR impresso
// com um endereço antigo continua abrindo a ficha certa.

export type TipoDeQr = "insumo" | "lote";

export const TIPOS_DE_QR: TipoDeQr[] = ["insumo", "lote"];

export interface ConteudoDoQr {
  tipo: TipoDeQr;
  id: string;
}

const PADRAO_DO_CAMINHO = /\/q\/(insumo|lote)\/([A-Za-z0-9-]{8,64})(?:[/?#]|$)/;

export function caminhoDoQr(tipo: TipoDeQr, id: string): string {
  return `/q/${tipo}/${id}`;
}

// origem: "https://beatus.exemplo.com" (com ou sem barra no fim). Vazia devolve só o caminho.
export function linkDoQr(origem: string, tipo: TipoDeQr, id: string): string {
  const base = origem.trim().replace(/\/+$/, "");

  return `${base}${caminhoDoQr(tipo, id)}`;
}

// Lê o texto de um QR (link inteiro ou só o caminho). Qualquer outra coisa
// (QR de outro sistema, NFC-e, texto solto) devolve null.
export function interpretarQr(texto: string): ConteudoDoQr | null {
  const encontrado = PADRAO_DO_CAMINHO.exec(texto.trim());

  if (!encontrado) {
    return null;
  }

  return { tipo: encontrado[1] as TipoDeQr, id: encontrado[2] };
}
