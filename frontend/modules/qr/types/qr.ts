import type { AjusteDoDia } from "@/modules/operacao/services/ajustes";

import type {
  CartaoDoQuadro,
  ItemDeEstoque,
  MovimentoListado,
  SaldoDeEstoque,
} from "@/modules/estoque/types/estoque";

export interface ConferenciaDoItem {
  itemTipo: string;
  itemId: string;
  nome: string;
  em: string;
  por?: string;
}

export interface FichaDoInsumo {
  item: SaldoDeEstoque;
  historico: MovimentoListado[];
  // Ajustes anotados para este item que ainda esperam.
  ajustes: AjusteDoDia[];
  // Última conferência de hoje pelo QR, se houve.
  conferidoHoje?: ConferenciaDoItem;
}

export interface FichaDoLote {
  loteId: string;
  loteCodigo?: string;
  nome: string;
  cartoes: CartaoDoQuadro[];
  ajustes: AjusteDoDia[];
  conferidoHoje?: ConferenciaDoItem;
}

export type TipoDoItemConferido = ItemDeEstoque | "LOTE";
