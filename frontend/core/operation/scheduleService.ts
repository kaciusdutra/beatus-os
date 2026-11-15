import {
  configuracaoPadrao,
  resolverHorarioDoDia,
  textoDaData,
  type ConfiguracaoDeHorarios,
} from "@/modules/operacao/services/horarios";

import type { OperationSchedule } from "./operationSchedule";

// Horário de funcionamento visto pelas telas. A fonte de verdade é o banco
// (Configurações → Horários); aqui fica uma cópia, carregada do servidor ao abrir
// o sistema e a cada minuto. Enquanto a cópia não chega (ou se o servidor não
// responder), vale o padrão do Beatus: quarta e quinta 18h às 22h, sexta e
// sábado 18h às 23h, domingo 18h às 22h; segunda e terça fechadas.
let configuracao: ConfiguracaoDeHorarios = configuracaoPadrao();

export function definirConfiguracaoDeHorarios(nova: ConfiguracaoDeHorarios): void {
  configuracao = nova;
}

export function obterConfiguracaoDeHorarios(): ConfiguracaoDeHorarios {
  return configuracao;
}

// Busca a configuração gravada. Falha de rede não derruba nada: continua valendo
// a última cópia que se tinha.
export async function carregarConfiguracaoDoServidor(): Promise<void> {
  try {
    const resposta = await fetch("/api/operacao/horarios", { cache: "no-store" });

    const dados = await resposta.json();

    if (resposta.ok && dados.sucesso && dados.configuracao) {
      definirConfiguracaoDeHorarios(dados.configuracao as ConfiguracaoDeHorarios);
    }
  } catch {
    // sem rede: mantém a cópia atual
  }
}

export function obterHorarioOperacao(data: Date = new Date()): OperationSchedule {
  const dia = textoDaData(data);

  const horario = resolverHorarioDoDia(dia, configuracao);

  return {
    data: dia,
    status: horario.aberto ? "ABERTO" : "FECHADO",
    abertura: horario.abertura,
    fechamento: horario.fechamento,
    observacao: horario.excecao?.observacao,
  };
}

export function estaAberto(data: Date = new Date()): boolean {
  return obterHorarioOperacao(data).status === "ABERTO";
}

export function obterHorarioAbertura(data: Date = new Date()): string | undefined {
  return obterHorarioOperacao(data).abertura;
}

export function obterHorarioFechamento(data: Date = new Date()): string | undefined {
  return obterHorarioOperacao(data).fechamento;
}
