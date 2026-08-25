"use client";

import Card from "@/shared/ui/Card";
import { useSystem } from "@/core/system/SystemContext";
import {
  obterHorarioAbertura,
  obterHorarioFechamento,
} from "@/core/operation/scheduleService";

export default function OperationOverviewCard() {
  const { systemState } = useSystem();

  const operationState = systemState.operation;

  const horarioAbertura = obterHorarioAbertura();
  const horarioFechamento = obterHorarioFechamento();

  function obterTitulo() {
    switch (operationState) {
      case "CHECKLIST":
        return "Checklist de Abertura";

      case "AGUARDANDO_ABERTURA":
        return "Aguardando Abertura";

      case "OPERANDO":
        return "Operação Ativa";

      case "FECHAMENTO":
        return "Fechamento";

      case "FECHADA":
      default:
        return "Operação Fechada";
    }
  }

  function obterIcone() {
    switch (operationState) {
      case "CHECKLIST":
        return "📋";

      case "AGUARDANDO_ABERTURA":
        return "🟡";

      case "OPERANDO":
        return "🟢";

      case "FECHAMENTO":
        return "🟠";

      case "FECHADA":
      default:
        return "🔴";
    }
  }

  function obterMensagem() {
    switch (operationState) {
      case "CHECKLIST":
        return "Conclua o checklist de abertura para liberar a operação.";

      case "AGUARDANDO_ABERTURA":
        return `Checklist concluído. A operação será aberta às ${
          horarioAbertura || "--:--"
        }.`;

      case "OPERANDO":
        return "A operação está ativa e os módulos operacionais estão liberados.";

      case "FECHAMENTO":
        return "O horário operacional foi encerrado. A operação está entrando em fechamento.";

      case "FECHADA":
      default:
        return "A Beatus não está em horário operacional.";
    }
  }

  function obterDestaque() {
    switch (operationState) {
      case "OPERANDO":
        return "text-green-600";

      case "AGUARDANDO_ABERTURA":
        return "text-amber-600";

      case "CHECKLIST":
        return "text-blue-600";

      case "FECHAMENTO":
        return "text-orange-600";

      case "FECHADA":
      default:
        return "text-red-600";
    }
  }

  function obterFundo() {
    switch (operationState) {
      case "OPERANDO":
        return "bg-green-50 border-green-200";

      case "AGUARDANDO_ABERTURA":
        return "bg-amber-50 border-amber-200";

      case "CHECKLIST":
        return "bg-blue-50 border-blue-200";

      case "FECHAMENTO":
        return "bg-orange-50 border-orange-200";

      case "FECHADA":
      default:
        return "bg-red-50 border-red-200";
    }
  }

  const mostrarHorarios =
    Boolean(horarioAbertura) ||
    Boolean(horarioFechamento);

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl sm:h-14 sm:w-14 sm:text-3xl ${obterFundo()}`}
          >
            {obterIcone()}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm">
              Estado da operação
            </p>

            <h2
              className={`mt-1 text-xl font-bold sm:text-2xl ${obterDestaque()}`}
            >
              {obterTitulo()}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600 sm:mt-2 sm:text-base">
              {obterMensagem()}
            </p>
          </div>
        </div>

        {mostrarHorarios && (
          <div className="flex shrink-0 gap-3">
            <div className="min-w-[100px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Abertura
              </p>

              <p className="mt-1 text-base font-bold text-slate-700">
                {horarioAbertura || "--:--"}
              </p>
            </div>

            <div className="min-w-[100px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Fechamento
              </p>

              <p className="mt-1 text-base font-bold text-slate-700">
                {horarioFechamento || "--:--"}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}