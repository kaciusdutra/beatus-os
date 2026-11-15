// Horário de funcionamento: padrão da semana, exceções por dia ou período e
// feriados nacionais. Tudo puro, sem acesso a banco ou navegador. Datas sempre
// em texto "AAAA-MM-DD" e horas em "HH:MM".

export interface HorarioDoDia {
  aberto: boolean;
  abertura?: string;
  fechamento?: string;
}

// Índice 0 = domingo ... 6 = sábado.
export type HorarioSemanal = HorarioDoDia[];

export interface ExcecaoDeHorario {
  id: string;
  inicio: string;
  fim: string;
  aberto: boolean;
  abertura?: string;
  fechamento?: string;
  observacao?: string;
}

export interface ConfiguracaoDeHorarios {
  semanal: HorarioSemanal;
  excecoes: ExcecaoDeHorario[];
}

export const NOMES_DOS_DIAS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

// Rotina do Beatus (decisão do Kacius em 15/11/2026): vende de quarta a domingo;
// segunda e terça são dias de produção.
export const HORARIO_PADRAO_SEMANAL: HorarioSemanal = [
  { aberto: true, abertura: "18:00", fechamento: "22:00" }, // domingo
  { aberto: false }, // segunda
  { aberto: false }, // terça
  { aberto: true, abertura: "18:00", fechamento: "22:00" }, // quarta
  { aberto: true, abertura: "18:00", fechamento: "22:00" }, // quinta
  { aberto: true, abertura: "18:00", fechamento: "23:00" }, // sexta
  { aberto: true, abertura: "18:00", fechamento: "23:00" }, // sábado
];

export function configuracaoPadrao(): ConfiguracaoDeHorarios {
  return {
    semanal: HORARIO_PADRAO_SEMANAL.map((dia) => ({ ...dia })),
    excecoes: [],
  };
}

const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

export function dataValida(texto: string): boolean {
  if (!FORMATO_DATA.test(texto)) {
    return false;
  }

  const [ano, mes, dia] = texto.split("-").map(Number);

  const data = new Date(Date.UTC(ano, mes - 1, dia));

  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

// Confere um horário: aberto precisa de abertura e fechamento válidos, com a
// abertura antes do fechamento. Devolve a mensagem do problema, ou null.
export function problemaNoHorario(horario: HorarioDoDia): string | null {
  if (!horario.aberto) {
    return null;
  }

  if (!horario.abertura || !FORMATO_HORA.test(horario.abertura)) {
    return "Informe a hora de abertura (HH:MM).";
  }

  if (!horario.fechamento || !FORMATO_HORA.test(horario.fechamento)) {
    return "Informe a hora de fechamento (HH:MM).";
  }

  if (horario.abertura >= horario.fechamento) {
    return "A abertura precisa ser antes do fechamento.";
  }

  return null;
}

export function textoDaData(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const dia = String(data.getDate()).padStart(2, "0");

  return `${data.getFullYear()}-${mes}-${dia}`;
}

// Dia da semana de uma data em texto (0 = domingo), sem depender de fuso.
export function diaDaSemanaDe(dataTexto: string): number {
  const [ano, mes, dia] = dataTexto.split("-").map(Number);

  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function somarDiasAoTexto(dataTexto: string, dias: number): string {
  const [ano, mes, dia] = dataTexto.split("-").map(Number);

  const data = new Date(Date.UTC(ano, mes - 1, dia + dias));

  return data.toISOString().slice(0, 10);
}

export interface HorarioResolvido extends HorarioDoDia {
  // De onde veio: da exceção ou do horário normal da semana
  origem: "EXCECAO" | "SEMANAL";
  excecao?: ExcecaoDeHorario;
  // Segunda ou terça sem exceção: o dia é de produção, sem venda
  diaDeProducao: boolean;
}

function tamanhoDaExcecao(excecao: ExcecaoDeHorario): number {
  return (
    (Date.parse(`${excecao.fim}T00:00:00Z`) - Date.parse(`${excecao.inicio}T00:00:00Z`)) / 86400000
  );
}

// O horário que vale numa data: a exceção que a cobre (a mais específica, isto
// é, a de período mais curto) ou, sem exceção, o horário normal do dia da semana.
export function resolverHorarioDoDia(
  dataTexto: string,
  configuracao: ConfiguracaoDeHorarios
): HorarioResolvido {
  const cobrindo = configuracao.excecoes
    .filter((excecao) => excecao.inicio <= dataTexto && dataTexto <= excecao.fim)
    .sort((a, b) => tamanhoDaExcecao(a) - tamanhoDaExcecao(b) || a.id.localeCompare(b.id));

  const excecao = cobrindo[0];

  const diaDaSemana = diaDaSemanaDe(dataTexto);

  const normal = configuracao.semanal[diaDaSemana] ?? { aberto: false };

  if (excecao) {
    return {
      aberto: excecao.aberto,
      abertura: excecao.aberto ? excecao.abertura : undefined,
      fechamento: excecao.aberto ? excecao.fechamento : undefined,
      origem: "EXCECAO",
      excecao,
      diaDeProducao: false,
    };
  }

  return {
    ...normal,
    origem: "SEMANAL",
    diaDeProducao: !normal.aberto && (diaDaSemana === 1 || diaDaSemana === 2),
  };
}

// ---------- Feriados nacionais ----------

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher).
export function domingoDePascoa(ano: number): string {
  const a = ano % 19;

  const b = Math.floor(ano / 100);

  const c = ano % 100;

  const d = Math.floor(b / 4);

  const e = b % 4;

  const f = Math.floor((b + 8) / 25);

  const g = Math.floor((b - f + 1) / 3);

  const h = (19 * a + b - d - g + 15) % 30;

  const i = Math.floor(c / 4);

  const k = c % 4;

  const l = (32 + 2 * e + 2 * i - h - k) % 7;

  const m = Math.floor((a + 11 * h + 22 * l) / 451);

  const mes = Math.floor((h + l - 7 * m + 114) / 31);

  const dia = ((h + l - 7 * m + 114) % 31) + 1;

  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export interface Feriado {
  data: string;
  nome: string;
}

// Feriados nacionais do ano: os fixos e os que dependem da Páscoa (Carnaval,
// Sexta-feira Santa e Corpus Christi). Feriados estaduais e municipais (de
// Manaus, por exemplo) o Kacius cadastra como exceção, com observação.
export function feriadosNacionais(ano: number): Feriado[] {
  const fixos: [string, string][] = [
    ["01-01", "Confraternização Universal"],
    ["04-21", "Tiradentes"],
    ["05-01", "Dia do Trabalho"],
    ["09-07", "Independência do Brasil"],
    ["10-12", "Nossa Senhora Aparecida"],
    ["11-02", "Finados"],
    ["11-15", "Proclamação da República"],
    ["11-20", "Dia da Consciência Negra"],
    ["12-25", "Natal"],
  ];

  const pascoa = domingoDePascoa(ano);

  const moveis: Feriado[] = [
    { data: somarDiasAoTexto(pascoa, -48), nome: "Carnaval (segunda)" },
    { data: somarDiasAoTexto(pascoa, -47), nome: "Carnaval (terça)" },
    { data: somarDiasAoTexto(pascoa, -2), nome: "Sexta-feira Santa" },
    { data: somarDiasAoTexto(pascoa, 60), nome: "Corpus Christi" },
  ];

  return [...fixos.map(([diaMes, nome]) => ({ data: `${ano}-${diaMes}`, nome })), ...moveis].sort((a, b) =>
    a.data.localeCompare(b.data)
  );
}

// ---------- Calendário do mês ----------

export interface DiaDoCalendario {
  data: string;
  diaDaSemana: number;
  horario: HorarioResolvido;
  feriado?: string;
  // Feriado que cai em dia de produção (segunda ou terça) e ainda sem exceção:
  // o Kacius pode querer abrir.
  feriadoEmDiaDeProducao: boolean;
}

export function calendarioDoMes(
  ano: number,
  mes: number,
  configuracao: ConfiguracaoDeHorarios,
  feriados: Feriado[] = feriadosNacionais(ano)
): DiaDoCalendario[] {
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

  const nomes = new Map(feriados.map((feriado) => [feriado.data, feriado.nome]));

  return Array.from({ length: ultimoDia }, (_, indice) => {
    const data = `${ano}-${String(mes).padStart(2, "0")}-${String(indice + 1).padStart(2, "0")}`;

    const horario = resolverHorarioDoDia(data, configuracao);

    const feriado = nomes.get(data);

    return {
      data,
      diaDaSemana: diaDaSemanaDe(data),
      horario,
      feriado,
      feriadoEmDiaDeProducao: Boolean(feriado) && horario.diaDeProducao,
    };
  });
}

// ---------- Estado da operação ----------

export type EstadoDaOperacao =
  | "FECHADA"
  | "CHECKLIST"
  | "AGUARDANDO_ABERTURA"
  | "OPERANDO"
  | "FECHAMENTO";

function minutos(hora?: string): number | undefined {
  if (!hora || !FORMATO_HORA.test(hora)) {
    return undefined;
  }

  const [h, m] = hora.split(":").map(Number);

  return h * 60 + m;
}

// O estado da operação num instante. Horário mal configurado nunca libera a
// operação (segurança): vira FECHADA.
export function estadoDaOperacao(
  horario: HorarioDoDia,
  checklistConcluido: boolean,
  agora: Date
): EstadoDaOperacao {
  if (!horario.aberto) {
    return "FECHADA";
  }

  const inicio = minutos(horario.abertura);

  const fim = minutos(horario.fechamento);

  if (inicio === undefined || fim === undefined) {
    return "FECHADA";
  }

  const atual = agora.getHours() * 60 + agora.getMinutes();

  if (atual < inicio) {
    return "AGUARDANDO_ABERTURA";
  }

  if (atual >= fim) {
    return "FECHAMENTO";
  }

  return checklistConcluido ? "OPERANDO" : "CHECKLIST";
}
