import type { CustoFixo } from "../types/custoFixo";

// O custo vale quando está ativo e a data cai dentro da vigência.
export function custoFixoVigente(
  custo: Pick<
    CustoFixo,
    "ativo" | "inicioVigencia" | "fimVigencia"
  >,
  em: Date
): boolean {
  if (!custo.ativo) {
    return false;
  }

  const momento = em.getTime();

  if (new Date(custo.inicioVigencia).getTime() > momento) {
    return false;
  }

  if (
    custo.fimVigencia &&
    new Date(custo.fimVigencia).getTime() < momento
  ) {
    return false;
  }

  return true;
}

// Regra 7.6: o aluguel conta pelo mês inteiro, sem proporção de dias.
export function totalMensalVigente(
  custos: Pick<
    CustoFixo,
    "ativo" | "inicioVigencia" | "fimVigencia" | "valorMensal"
  >[],
  em: Date
): number {
  const total = custos
    .filter((custo) => custoFixoVigente(custo, em))
    .reduce((soma, custo) => soma + custo.valorMensal, 0);

  return Math.round(total * 100) / 100;
}

// Rateio por pedido: total do mês dividido pelos pedidos esperados.
export function custoFixoPorPedido(
  totalMensal: number,
  pedidosMensais: number
): number | undefined {
  if (!(pedidosMensais > 0)) {
    return undefined;
  }

  return Math.round((totalMensal / pedidosMensais) * 10000) / 10000;
}
