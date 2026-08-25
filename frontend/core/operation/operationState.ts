import {
  obterHorarioOperacao,
} from "./scheduleService";

export type OperationState =
  | "FECHADA"
  | "CHECKLIST"
  | "AGUARDANDO_ABERTURA"
  | "OPERANDO"
  | "FECHAMENTO";

function converterHorarioParaMinutos(
  horario?: string
): number | undefined {
  if (!horario) {
    return undefined;
  }

  const [hora, minuto] = horario
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hora) ||
    Number.isNaN(minuto)
  ) {
    return undefined;
  }

  return hora * 60 + minuto;
}

export function getOperationState(
  checklistConcluido: boolean,
  agora: Date = new Date()
): OperationState {
  const horario = obterHorarioOperacao(agora);

  /*
   * Se o dia estiver configurado como fechado,
   * a operação permanece fechada.
   */
  if (horario.status === "FECHADO") {
    return "FECHADA";
  }

  const inicio =
    converterHorarioParaMinutos(
      horario.abertura
    );

  const fim =
    converterHorarioParaMinutos(
      horario.fechamento
    );

  const horaAtual =
    agora.getHours() * 60 +
    agora.getMinutes();

  /*
   * Segurança: se o horário estiver
   * configurado incorretamente, não
   * liberamos a operação.
   */
  if (
    inicio === undefined ||
    fim === undefined
  ) {
    return "FECHADA";
  }

  /*
   * Antes do horário de abertura,
   * o sistema aguarda o momento correto.
   */
  if (horaAtual < inicio) {
    return "AGUARDANDO_ABERTURA";
  }

  /*
   * Depois do horário de fechamento,
   * a operação entrou em fechamento.
   */
  if (horaAtual >= fim) {
    return "FECHAMENTO";
  }

  /*
   * O horário chegou, mas o checklist
   * ainda não foi concluído.
   */
  if (!checklistConcluido) {
    return "CHECKLIST";
  }

  /*
   * Horário correto + checklist concluído.
   */
  return "OPERANDO";
}