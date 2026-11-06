// Destino de cada item da entrada de compra (REGRAS_DE_NEGOCIO.md, seção 9).
// Arquivo sem dependências de servidor: pode ser usado nas telas e nos serviços.

export type DestinoItemCompra =
  | "INSUMO"
  | "EMBALAGEM"
  | "LIMPEZA_HIGIENE"
  | "EXPEDIENTE"
  | "EQUIPAMENTO_UTENSILIO"
  | "SERVICO";

export const DESTINOS_ITEM_COMPRA: {
  valor: DestinoItemCompra;
  rotulo: string;
}[] = [
  { valor: "INSUMO", rotulo: "Insumo" },
  { valor: "EMBALAGEM", rotulo: "Embalagem" },
  { valor: "LIMPEZA_HIGIENE", rotulo: "Limpeza e higiene" },
  { valor: "EXPEDIENTE", rotulo: "Expediente" },
  {
    valor: "EQUIPAMENTO_UTENSILIO",
    rotulo: "Equipamento e utensílio",
  },
  { valor: "SERVICO", rotulo: "Serviço" },
];

export function ehDestinoItemCompra(
  valor: unknown
): valor is DestinoItemCompra {
  return DESTINOS_ITEM_COMPRA.some(
    (destino) => destino.valor === valor
  );
}

export function rotuloDestinoItemCompra(
  destino?: string | null
): string {
  return (
    DESTINOS_ITEM_COMPRA.find(
      (item) => item.valor === destino
    )?.rotulo ?? "Não classificado"
  );
}

// Regra 9.13: chave do item do fornecedor. CAIXA ALTA, sem acentos,
// sem caracteres especiais e sem espaços repetidos.
// Ex.: "Pão brioche c/ 6" -> "PAO BRIOCHE C 6".
export function normalizarDescricaoItemCompra(
  descricao: string
): string {
  return descricao
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

// Regra 9.8: quantos itens ainda impedem a confirmação (sem destino).
export function contarItensSemDestino(
  itens: {
    destino?: string | null;
  }[]
): number {
  return itens.filter((item) => !item.destino)
    .length;
}
