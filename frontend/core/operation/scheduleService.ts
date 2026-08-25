import {
  DailyException,
  OperationSchedule,
  OperationScheduleConfig,
  defaultOperationSchedule,
} from "./operationSchedule";

let scheduleConfig: OperationScheduleConfig = {
  ...defaultOperationSchedule,
  semanal: {
    ...defaultOperationSchedule.semanal,
  },
  mensais: [...defaultOperationSchedule.mensais],
  excecoes: [...defaultOperationSchedule.excecoes],
};

const diasDaSemana: Array<
  keyof OperationScheduleConfig["semanal"]
> = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

function formatarData(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function obterDiaDaSemana(
  data: Date
): keyof OperationScheduleConfig["semanal"] {
  return diasDaSemana[data.getDay()];
}

function buscarExcecao(
  data: Date
): DailyException | undefined {
  const dataFormatada = formatarData(data);

  return scheduleConfig.excecoes.find(
    (excecao) => excecao.data === dataFormatada
  );
}

function buscarProgramacaoMensal(
  data: Date
): OperationSchedule | undefined {
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1;
  const dataFormatada = formatarData(data);

  const mesConfigurado = scheduleConfig.mensais.find(
    (configuracao) =>
      configuracao.ano === ano &&
      configuracao.mes === mes
  );

  if (!mesConfigurado) {
    return undefined;
  }

  return mesConfigurado.horarios.find(
    (horario) => horario.data === dataFormatada
  );
}

export function obterHorarioOperacao(
  data: Date = new Date()
): OperationSchedule {
  const excecao = buscarExcecao(data);

  if (excecao) {
    return excecao;
  }

  const programacaoMensal =
    buscarProgramacaoMensal(data);

  if (programacaoMensal) {
    return programacaoMensal;
  }

  const diaDaSemana = obterDiaDaSemana(data);

  return scheduleConfig.semanal[diaDaSemana];
}

export function estaAberto(
  data: Date = new Date()
): boolean {
  const horario = obterHorarioOperacao(data);

  return horario.status === "ABERTO";
}

export function obterHorarioAbertura(
  data: Date = new Date()
): string | undefined {
  return obterHorarioOperacao(data).abertura;
}

export function obterHorarioFechamento(
  data: Date = new Date()
): string | undefined {
  return obterHorarioOperacao(data).fechamento;
}

export function obterProgramacaoSemanal(): OperationScheduleConfig["semanal"] {
  return {
    ...scheduleConfig.semanal,
  };
}

export function salvarProgramacaoSemanal(
  semanal: OperationScheduleConfig["semanal"]
): void {
  scheduleConfig = {
    ...scheduleConfig,
    semanal: {
      ...semanal,
    },
  };
}

export function obterConfiguracaoHorarios(): OperationScheduleConfig {
  return {
    ...scheduleConfig,
    semanal: {
      ...scheduleConfig.semanal,
    },
    mensais: [...scheduleConfig.mensais],
    excecoes: [...scheduleConfig.excecoes],
  };
}