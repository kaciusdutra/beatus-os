"use client";

import Card from "@/shared/ui/Card";
import { useSystem } from "@/core/system/SystemContext";

export default function GreetingCard() {
  const { systemState } = useSystem();

  const hora = new Date().getHours();

  let saudacao = "Boa noite";

  if (hora < 12) {
    saudacao = "Bom dia";
  } else if (hora < 18) {
    saudacao = "Boa tarde";
  }

  function obterMensagem() {
    switch (systemState.operation) {
      case "CHECKLIST":
        return "Conclua o checklist de abertura para preparar a operação.";

      case "AGUARDANDO_ABERTURA":
        return "Checklist concluído. A operação está aguardando o horário de abertura.";

      case "OPERANDO":
        return "A operação está ativa. Os módulos operacionais estão liberados.";

      case "FECHAMENTO":
        return "O horário operacional terminou. A operação está entrando em fechamento.";

      case "FECHADA":
      default:
        return "A Beatus está fora do horário operacional.";
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            {saudacao}, Kacius 👋
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {obterMensagem()}
          </p>
        </div>

        <div className="hidden shrink-0 rounded-xl bg-slate-50 px-4 py-3 text-right sm:block">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Central de Operações
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            Beatus OS
          </p>
        </div>
      </div>
    </Card>
  );
}