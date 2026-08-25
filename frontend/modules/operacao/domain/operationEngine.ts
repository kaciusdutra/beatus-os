import { OperationStatus } from "../types/operation";

export function podeLiberarOperacao(
  status: OperationStatus
): boolean {
  return (
    status.podeOperar &&
    status.itensPendentes === 0
  );
}