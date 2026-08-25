"use client";

import { useState } from "react";

import ChecklistItemCard from "../components/ChecklistItemCard";

import {
  obterChecklist,
  concluirChecklistItem,
  reabrirChecklistItem,
  obterPercentualChecklist,
  obterItensPendentes,
  todosObrigatoriosConcluidos,
} from "../services/checklistService";

import { ChecklistItem } from "../types/checklist";

import { obterHorarioAbertura } from "@/core/operation/scheduleService";
import { useSystem } from "@/core/system/SystemContext";

export default function OperacaoPage() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    obterChecklist()
  );

  const { systemState } = useSystem();

  function atualizarChecklist() {
    setChecklist([...obterChecklist()]);
  }

  function handleToggle(id: string) {
    const item = checklist.find(
      (item) => item.id === id
    );

    if (!item) {
      return;
    }

    if (item.status === "concluido") {
      reabrirChecklistItem(id);
    } else {
      concluirChecklistItem(id);
    }

    atualizarChecklist();
  }

  const percentual = obterPercentualChecklist();

  const pendentes = obterItensPendentes().length;

  const concluidos = checklist.length - pendentes;

  const liberado = todosObrigatoriosConcluidos();

  const horarioAbertura = obterHorarioAbertura();

  const operationState = systemState.operation;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">
          Checklist de Abertura
        </h2>

        <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-green-600 transition-all"
            style={{ width: `${percentual}%` }}
          />
        </div>

        <p className="mt-3 font-semibold">
          {percentual}% concluído
        </p>

        <div className="mt-5 space-y-2">
          <p>✅ Concluídos: {concluidos}</p>

          <p>⏳ Pendentes: {pendentes}</p>

          <p
            className={
              liberado
                ? "text-green-600"
                : "text-red-600"
            }
          >
            {liberado
              ? "🟢 Operação Liberada"
              : "🔒 Operação Bloqueada"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">
          Estado da Operação
        </h2>

        <p className="mt-2 text-lg font-semibold">
          {operationState}
        </p>

        {operationState === "AGUARDANDO_ABERTURA" && (
          <p className="mt-2 text-gray-500">
            Checklist concluído. Aguardando abertura às{" "}
            {horarioAbertura}.
          </p>
        )}

        {operationState === "OPERANDO" && (
          <p className="mt-2 font-semibold text-green-600">
            Operação em andamento.
          </p>
        )}

        {operationState === "FECHADA" && (
          <p className="mt-2 text-gray-500">
            A operação está fechada.
          </p>
        )}

        {operationState === "CHECKLIST" && (
          <p className="mt-2 text-gray-500">
            Conclua o checklist de abertura para liberar a
            operação.
          </p>
        )}

        {operationState === "FECHAMENTO" && (
          <p className="mt-2 text-gray-500">
            O horário de operação foi encerrado.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {checklist.map((item) => (
          <ChecklistItemCard
            key={item.id}
            item={item}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}