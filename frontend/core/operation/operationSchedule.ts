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

export interface WeeklySchedule {
  domingo: OperationSchedule;
  segunda: OperationSchedule;
  terca: OperationSchedule;
  quarta: OperationSchedule;
  quinta: OperationSchedule;
  sexta: OperationSchedule;
  sabado: OperationSchedule;
}

export interface MonthlySchedule {
  ano: number;
  mes: number;
  horarios: OperationSchedule[];
}

export interface DailyException {
  data: string;
  status: ScheduleStatus;
  abertura?: string;
  fechamento?: string;
  observacao?: string;
}

export interface OperationScheduleConfig {
  horarioPadrao: OperationSchedule;
  semanal: WeeklySchedule;
  mensais: MonthlySchedule[];
  excecoes: DailyException[];
}

export const defaultOperationSchedule: OperationScheduleConfig = {
  horarioPadrao: {
    data: "",
    status: "ABERTO",
    abertura: "18:00",
    fechamento: "23:00",
  },

  semanal: {
    domingo: {
      data: "",
      status: "FECHADO",
    },

    segunda: {
      data: "",
      status: "FECHADO",
    },

    terca: {
      data: "",
      status: "FECHADO",
    },

    quarta: {
      data: "",
      status: "ABERTO",
      abertura: "18:00",
      fechamento: "23:00",
    },

    quinta: {
      data: "",
      status: "ABERTO",
      abertura: "18:00",
      fechamento: "23:00",
    },

    sexta: {
      data: "",
      status: "ABERTO",
      abertura: "18:00",
      fechamento: "23:00",
    },

    sabado: {
      data: "",
      status: "ABERTO",
      abertura: "18:00",
      fechamento: "23:00",
    },
  },

  mensais: [],

  excecoes: [],
};