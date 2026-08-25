import { OperationState } from "@/core/operation/operationState";

const PARAMETRO_SIMULACAO = "sim";

const ESTADOS_VALIDOS: OperationState[] = [
  "FECHADA",
  "CHECKLIST",
  "AGUARDANDO_ABERTURA",
  "OPERANDO",
  "FECHAMENTO",
];

export function obterEstadoSimulado(): OperationState | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const parametros = new URLSearchParams(
    window.location.search
  );

  const valor = parametros.get(
    PARAMETRO_SIMULACAO
  );

  if (!valor) {
    return undefined;
  }

  const estado = valor.toUpperCase() as OperationState;

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return undefined;
  }

  return estado;
}

export function simulacaoAtiva(): boolean {
  return obterEstadoSimulado() !== undefined;
}