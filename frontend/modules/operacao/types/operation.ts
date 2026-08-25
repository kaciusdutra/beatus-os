export type OperationState =
  | "fechada"
  | "abertura"
  | "operando"
  | "fechamento";

export interface OperationStatus {
  estado: OperationState;
  podeOperar: boolean;
  percentualChecklist: number;
  itensPendentes: number;
}