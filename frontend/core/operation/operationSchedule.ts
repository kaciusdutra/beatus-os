// Tipos do horário como as telas o enxergam. A configuração (horário normal e
// exceções) vive em modules/operacao/services/horarios.ts e no banco.

export type ScheduleStatus =
  | "ABERTO"
  | "FECHADO";

export interface OperationSchedule {
  data: string;
  status: ScheduleStatus;
  abertura?: string;
  fechamento?: string;
  observacao?: string;
}
