"use client";

import { useCallback, useState } from "react";

import OperationScheduleCard from "@/modules/operacao/components/OperationScheduleCard";

import {
  obterProgramacaoSemanal,
  salvarProgramacaoSemanal,
} from "@/core/operation/scheduleService";

import { OperationSchedule } from "@/core/operation/operationSchedule";

type DiaSemana =
  | "domingo"
  | "segunda"
  | "terca"
  | "quarta"
  | "quinta"
  | "sexta"
  | "sabado";

const nomesDias: Record<DiaSemana, string> = {
  domingo: "Domingo",
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
};

const ordemDias: DiaSemana[] = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

export default function HorariosPage() {
  const [programacao, setProgramacao] = useState(
    obterProgramacaoSemanal()
  );

  const [salvo, setSalvo] = useState(false);

  const atualizarDia = useCallback(
    (
      dia: DiaSemana,
      fechado: boolean,
      abertura: string,
      fechamento: string
    ) => {
      setProgramacao((atual) => ({
        ...atual,

        [dia]: {
          ...atual[dia],
          status: fechado
            ? "FECHADO"
            : "ABERTO",
          abertura: fechado
            ? undefined
            : abertura,
          fechamento: fechado
            ? undefined
            : fechamento,
        },
      }));

      setSalvo(false);
    },
    []
  );

  function handleSalvar() {
    salvarProgramacaoSemanal(programacao);
    setSalvo(true);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Horários Operacionais
          </h1>

          <p className="mt-2 text-gray-500">
            Configure os horários de funcionamento da Beatus.
          </p>
        </div>

        <section className="space-y-4">
          {ordemDias.map((dia) => {
            const horario: OperationSchedule =
              programacao[dia];

            return (
              <OperationScheduleCard
                key={dia}
                dia={nomesDias[dia]}
                aberturaInicial={
                  horario.abertura ?? ""
                }
                fechamentoInicial={
                  horario.fechamento ?? ""
                }
                fechadoInicial={
                  horario.status === "FECHADO"
                }
                onChange={(
                  fechado,
                  abertura,
                  fechamento
                ) =>
                  atualizarDia(
                    dia,
                    fechado,
                    abertura,
                    fechamento
                  )
                }
              />
            );
          })}
        </section>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="button"
            onClick={handleSalvar}
            className="rounded-lg bg-black px-6 py-3 font-semibold text-white transition hover:opacity-90"
          >
            Salvar programação
          </button>

          {salvo && (
            <span className="font-medium text-green-600">
              Programação salva com sucesso.
            </span>
          )}
        </div>
      </div>
    </main>
  );
}