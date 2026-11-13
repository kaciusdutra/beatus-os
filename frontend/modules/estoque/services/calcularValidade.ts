// Validade das preparações (norma adotada pelo Kacius: Portaria CVS 3/2026 de
// São Paulo, art. 44). Os prazos são editáveis no sistema; estes valores são
// só o ponto de partida e precisam ser conferidos no texto oficial.
// Funções puras, sem banco.

export interface RegraDeValidade {
  categoria: string;

  descricao: string;

  conservacao: "CONGELADO" | "RESFRIADO";

  temperatura: string;

  dias: number;
}

export const FONTE_DAS_REGRAS =
  "Portaria CVS 3/2026 (São Paulo), art. 44. Conferir no texto oficial.";

export const REGRAS_PADRAO: RegraDeValidade[] = [
  {
    categoria: "CONGELADO_ABAIXO_18",
    descricao: "Congelado abaixo de −18 °C",
    conservacao: "CONGELADO",
    temperatura: "abaixo de −18 °C",
    dias: 90,
  },
  {
    categoria: "CONGELADO_11_A_18",
    descricao: "Congelado de −11 a −18 °C",
    conservacao: "CONGELADO",
    temperatura: "−11 a −18 °C",
    dias: 30,
  },
  {
    categoria: "CONGELADO_6_A_10",
    descricao: "Congelado de −6 a −10 °C",
    conservacao: "CONGELADO",
    temperatura: "−6 a −10 °C",
    dias: 20,
  },
  {
    categoria: "CONGELADO_0_A_5",
    descricao: "Congelado de 0 a −5 °C",
    conservacao: "CONGELADO",
    temperatura: "0 a −5 °C",
    dias: 10,
  },
  {
    categoria: "RESFRIADO_CARNE_MOIDA",
    descricao: "Resfriado: preparações com carne moída",
    conservacao: "RESFRIADO",
    temperatura: "até 4 °C",
    dias: 2,
  },
  {
    categoria: "RESFRIADO_CARNE_CRUA",
    descricao: "Resfriado: carnes bovina, suína, aves e produtos crus",
    conservacao: "RESFRIADO",
    temperatura: "até 4 °C",
    dias: 3,
  },
  {
    categoria: "RESFRIADO_POS_COCCAO",
    descricao: "Resfriado: alimentos pós-cocção",
    conservacao: "RESFRIADO",
    temperatura: "até 4 °C",
    dias: 3,
  },
  {
    categoria: "RESFRIADO_MAIONESE",
    descricao: "Resfriado: maionese e misturas com maionese",
    conservacao: "RESFRIADO",
    temperatura: "até 4 °C",
    dias: 2,
  },
  {
    categoria: "RESFRIADO_DEMAIS",
    descricao: "Resfriado: demais alimentos preparados",
    conservacao: "RESFRIADO",
    temperatura: "até 4 °C",
    dias: 3,
  },
];

// Sem a temperatura do freezer medida, vale o prazo de 30 dias (decisão do Kacius).
export const CATEGORIA_SEM_TEMPERATURA = "CONGELADO_11_A_18";

// Qual faixa da norma vale para a temperatura do freezer.
export function categoriaDoCongelado(temperaturaFreezerC: number | null | undefined): string {
  if (temperaturaFreezerC === null || temperaturaFreezerC === undefined || !Number.isFinite(temperaturaFreezerC)) {
    return CATEGORIA_SEM_TEMPERATURA;
  }

  if (temperaturaFreezerC < -18) {
    return "CONGELADO_ABAIXO_18";
  }

  if (temperaturaFreezerC <= -11) {
    return "CONGELADO_11_A_18";
  }

  if (temperaturaFreezerC <= -6) {
    return "CONGELADO_6_A_10";
  }

  // Acima de 0 °C não é congelado: vale a faixa mais curta.
  return "CONGELADO_0_A_5";
}

export function diasDaRegra(
  regras: Pick<RegraDeValidade, "categoria" | "dias">[],
  categoria: string
): number {
  const regra = regras.find((item) => item.categoria === categoria);

  if (regra) {
    return regra.dias;
  }

  return (
    REGRAS_PADRAO.find((item) => item.categoria === categoria)?.dias ?? 1
  );
}

function somarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 86400000);
}

// Validade do lote congelado, contada da produção.
export function validadeDoCongelado(
  producaoEm: Date,
  regras: Pick<RegraDeValidade, "categoria" | "dias">[],
  temperaturaFreezerC: number | null | undefined
): { validadeAte: Date; categoria: string; dias: number } {
  const categoria = categoriaDoCongelado(temperaturaFreezerC);

  const dias = diasDaRegra(regras, categoria);

  return { validadeAte: somarDias(producaoEm, dias), categoria, dias };
}

// Validade depois de descongelar: conta do descongelamento e nunca passa da
// validade do próprio lote congelado (a validade não se revalida).
export function validadeDoDescongelado(
  descongeladoEm: Date,
  diasResfriado: number,
  validadeDoCongeladoAte?: Date
): Date {
  const resfriado = somarDias(descongeladoEm, diasResfriado);

  if (validadeDoCongeladoAte && validadeDoCongeladoAte < resfriado) {
    return validadeDoCongeladoAte;
  }

  return resfriado;
}

export type SituacaoDaValidade = "VENCIDO" | "VENCE_LOGO" | "OK";

// Vencido; ou perto de vencer (freezer: 7 dias; geladeira e cozinha: 24 horas).
export function situacaoDaValidade(
  validadeAte: Date | null | undefined,
  agora: Date,
  congelado: boolean
): SituacaoDaValidade {
  if (!validadeAte) {
    return "OK";
  }

  const restanteMs = validadeAte.getTime() - agora.getTime();

  if (restanteMs <= 0) {
    return "VENCIDO";
  }

  const limite = congelado ? 7 * 86400000 : 86400000;

  return restanteMs <= limite ? "VENCE_LOGO" : "OK";
}
