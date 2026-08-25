import { OperationStatus } from "../types/operationStatus";

export function getOperationStatus(): OperationStatus {
  return {
    percentual: 82,
    pronta: false,
    pendencias: 2,
  };
}