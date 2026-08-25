import { OperationStatus } from "../types/operation";

export function getOperationStatus(): OperationStatus {
  return {
    estado: "abertura",
    podeOperar: false,
    percentualChecklist: 68,
    itensPendentes: 2,
  };
}