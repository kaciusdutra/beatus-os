import {
  NOMES_DOS_DIAS,
  diaDaSemanaDe,
  resolverHorarioDoDia,
  somarDiasAoTexto,
  type ConfiguracaoDeHorarios,
} from "@/modules/operacao/services/horarios";

// O Beatus funciona em Manaus. O site mostra "aberto agora" pelo relógio de Manaus,
// mesmo que o servidor esteja em outro fuso (hospedagem costuma rodar em UTC).
export const FUSO_DO_SITE = "America/Manaus";

export interface MomentoLocal {
  data: string;
  minutos: number;
}

export function agoraNoFusoDoSite(agora: Date): MomentoLocal {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_DO_SITE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);

  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "00";

  return {
    data: `${valor("year")}-${valor("month")}-${valor("day")}`,
    minutos: Number(valor("hour")) * 60 + Number(valor("minute")),
  };
}

export type SituacaoDoSite = "ABERTO" | "VAI_ABRIR_HOJE" | "ENCERRADO_HOJE" | "FECHADO_HOJE";

export interface Funcionamento {
  situacao: SituacaoDoSite;
  // O cliente pode fazer pedido agora? (só com a casa aberta)
  recebePedidos: boolean;
  // Texto pronto para o site.
  texto: string;
  abertura?: string;
  fechamento?: string;
  proximaAbertura?: { data: string; diaDaSemana: string; abertura: string; amanha: boolean };
}

function emMinutos(hora?: string): number | null {
  if (!hora || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    return null;
  }

  const [h, m] = hora.split(":").map(Number);

  return h * 60 + m;
}

// Procura o próximo dia com a casa aberta, a partir de `depoisDe` (sem incluí-lo).
function proximaAbertura(config: ConfiguracaoDeHorarios, depoisDe: string): Funcionamento["proximaAbertura"] {
  for (let passo = 1; passo <= 21; passo++) {
    const data = somarDiasAoTexto(depoisDe, passo);

    const horario = resolverHorarioDoDia(data, config);

    if (horario.aberto && emMinutos(horario.abertura) !== null && emMinutos(horario.fechamento) !== null) {
      return {
        data,
        diaDaSemana: NOMES_DOS_DIAS[diaDaSemanaDe(data)],
        abertura: horario.abertura as string,
        amanha: passo === 1,
      };
    }
  }

  return undefined;
}

function textoDaProxima(proxima: Funcionamento["proximaAbertura"]): string {
  if (!proxima) {
    return "Sem previsão de abertura.";
  }

  return `Abrimos ${proxima.amanha ? "amanhã" : proxima.diaDaSemana.toLowerCase()} às ${proxima.abertura}.`;
}

export function calcularFuncionamento(config: ConfiguracaoDeHorarios, agora: MomentoLocal): Funcionamento {
  const hoje = resolverHorarioDoDia(agora.data, config);

  const abre = emMinutos(hoje.abertura);

  const fecha = emMinutos(hoje.fechamento);

  // Horário mal configurado nunca abre a casa para o cliente (mesma regra do sistema).
  if (!hoje.aberto || abre === null || fecha === null) {
    const proxima = proximaAbertura(config, agora.data);

    return { situacao: "FECHADO_HOJE", recebePedidos: false, texto: `Fechados hoje. ${textoDaProxima(proxima)}`, proximaAbertura: proxima };
  }

  if (agora.minutos < abre) {
    return { situacao: "VAI_ABRIR_HOJE", recebePedidos: false, texto: `Abrimos hoje às ${hoje.abertura}.`, abertura: hoje.abertura, fechamento: hoje.fechamento };
  }

  if (agora.minutos >= fecha) {
    const proxima = proximaAbertura(config, agora.data);

    return {
      situacao: "ENCERRADO_HOJE",
      recebePedidos: false,
      texto: `Encerramos por hoje. ${textoDaProxima(proxima)}`,
      abertura: hoje.abertura,
      fechamento: hoje.fechamento,
      proximaAbertura: proxima,
    };
  }

  return { situacao: "ABERTO", recebePedidos: true, texto: `Aberto agora, até as ${hoje.fechamento}.`, abertura: hoje.abertura, fechamento: hoje.fechamento };
}

export interface LinhaDaSemana {
  dia: string;
  texto: string;
}

// O horário normal da semana, para o rodapé do site (de segunda a domingo).
// Exceções por data não entram aqui: elas aparecem no "aberto agora".
export function resumoDaSemana(config: ConfiguracaoDeHorarios): LinhaDaSemana[] {
  return [1, 2, 3, 4, 5, 6, 0].map((indice) => {
    const dia = config.semanal[indice];

    const abre = emMinutos(dia?.abertura);

    const fecha = emMinutos(dia?.fechamento);

    return {
      dia: NOMES_DOS_DIAS[indice],
      texto: dia?.aberto && abre !== null && fecha !== null ? `${dia.abertura} às ${dia.fechamento}` : "Fechado",
    };
  });
}
