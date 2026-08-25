import {
  getOperationState,
  OperationState,
} from "@/core/operation/operationState";

import { todosObrigatoriosConcluidos } from "@/modules/operacao/services/checklistService";

export interface SystemState {
  operation: OperationState;
  checklistConcluido: boolean;
  atualizadoEm: Date;
}

export function getSystemState(
  agora: Date = new Date()
): SystemState {
  const checklistConcluido =
    todosObrigatoriosConcluidos();

  const operation = getOperationState(
    checklistConcluido,
    agora
  );

  return {
    operation,
    checklistConcluido,
    atualizadoEm: agora,
  };
}