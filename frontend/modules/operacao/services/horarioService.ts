import type { HorarioRepositoryPort } from "../repositories/horarioRepositoryPort";

import {
  NOMES_DOS_DIAS,
  dataValida,
  problemaNoHorario,
  type ConfiguracaoDeHorarios,
  type ExcecaoDeHorario,
  type HorarioSemanal,
} from "./horarios";

export type RegistrarOperacao = (dados: {
  acao: string;
  resumo: string;
  referenciaId?: string;
  operador?: string | null;
}) => Promise<void>;

function resumoDoHorario(horario: { aberto: boolean; abertura?: string; fechamento?: string }): string {
  return horario.aberto ? `${horario.abertura}–${horario.fechamento}` : "fechado";
}

function dataBr(texto: string): string {
  const [ano, mes, dia] = texto.split("-");

  return `${dia}/${mes}/${ano}`;
}

export class HorarioService {
  constructor(
    private readonly repository: HorarioRepositoryPort,
    // Registro de atividades (diário da operação); opcional.
    private readonly registrar?: RegistrarOperacao
  ) {}

  async obter(): Promise<ConfiguracaoDeHorarios> {
    return this.repository.carregar();
  }

  // Salva o horário normal da semana (7 dias, de domingo a sábado).
  async salvarSemana(semanal: HorarioSemanal, operador?: string | null): Promise<ConfiguracaoDeHorarios> {
    if (!Array.isArray(semanal) || semanal.length !== 7) {
      throw new Error("Informe os 7 dias da semana.");
    }

    semanal.forEach((dia, indice) => {
      const problema = problemaNoHorario(dia);

      if (problema) {
        throw new Error(`${NOMES_DOS_DIAS[indice]}: ${problema}`);
      }
    });

    const antes = await this.repository.carregar();

    await this.repository.salvarSemana(
      semanal.map((dia) =>
        dia.aberto ? { aberto: true, abertura: dia.abertura, fechamento: dia.fechamento } : { aberto: false }
      )
    );

    const mudancas = semanal
      .map((dia, indice) =>
        resumoDoHorario(dia) !== resumoDoHorario(antes.semanal[indice])
          ? `${NOMES_DOS_DIAS[indice]}: ${resumoDoHorario(antes.semanal[indice])} → ${resumoDoHorario(dia)}`
          : null
      )
      .filter((texto): texto is string => texto !== null);

    if (mudancas.length > 0) {
      await this.registrar?.({
        acao: "HORARIOS_ALTERADOS",
        resumo: `Horário da semana alterado. ${mudancas.join("; ")}.`,
        operador,
      });
    }

    return this.repository.carregar();
  }

  // Exceção para um dia (inicio = fim) ou para um período.
  async criarExcecao(
    dados: Omit<ExcecaoDeHorario, "id">,
    operador?: string | null
  ): Promise<ExcecaoDeHorario> {
    if (!dataValida(dados.inicio) || !dataValida(dados.fim)) {
      throw new Error("Informe as datas no formato AAAA-MM-DD.");
    }

    if (dados.fim < dados.inicio) {
      throw new Error("A data final não pode ser antes da inicial.");
    }

    const dias = (Date.parse(`${dados.fim}T00:00:00Z`) - Date.parse(`${dados.inicio}T00:00:00Z`)) / 86400000 + 1;

    if (dias > 366) {
      throw new Error("Uma exceção pode cobrir no máximo 366 dias.");
    }

    const problema = problemaNoHorario(dados);

    if (problema) {
      throw new Error(problema);
    }

    const observacao = dados.observacao?.trim().slice(0, 120) || undefined;

    const criada = await this.repository.criarExcecao({
      inicio: dados.inicio,
      fim: dados.fim,
      aberto: dados.aberto,
      abertura: dados.aberto ? dados.abertura : undefined,
      fechamento: dados.aberto ? dados.fechamento : undefined,
      observacao,
    });

    const quando = dados.inicio === dados.fim ? dataBr(dados.inicio) : `${dataBr(dados.inicio)} a ${dataBr(dados.fim)}`;

    await this.registrar?.({
      acao: "EXCECAO_DE_HORARIO",
      resumo: `Exceção de horário em ${quando}: ${resumoDoHorario(dados)}${observacao ? ` (${observacao})` : ""}.`,
      referenciaId: criada.id,
      operador,
    });

    return criada;
  }

  async removerExcecao(id: string, operador?: string | null): Promise<void> {
    const removida = await this.repository.removerExcecao(id);

    if (!removida) {
      throw new Error("Exceção não encontrada.");
    }

    const quando =
      removida.inicio === removida.fim ? dataBr(removida.inicio) : `${dataBr(removida.inicio)} a ${dataBr(removida.fim)}`;

    await this.registrar?.({
      acao: "EXCECAO_REMOVIDA",
      resumo: `Exceção de horário de ${quando} removida; volta o horário normal.`,
      referenciaId: id,
      operador,
    });
  }
}
