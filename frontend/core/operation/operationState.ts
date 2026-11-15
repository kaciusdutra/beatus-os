import {
  estadoDaOperacao,
  type EstadoDaOperacao,
} from "@/modules/operacao/services/horarios";

import { obterHorarioOperacao } from "./scheduleService";

export type OperationState = EstadoDaOperacao;

// O estado da operação agora: dia fechado, aguardando a abertura, aguardando o
// checklist, operando ou em fechamento. A conta é a mesma do servidor
// (modules/operacao/services/horarios.ts).
export function getOperationState(
  checklistConcluido: boolean,
  agora: Date = new Date()
): OperationState {
  const horario = obterHorarioOperacao(agora);

  return estadoDaOperacao(
    {
      aberto: horario.status === "ABERTO",
      abertura: horario.abertura,
      fechamento: horario.fechamento,
    },
    checklistConcluido,
    agora
  );
}
