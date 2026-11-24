import type { Dre, EntradaDaDre } from "../types/dre";

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function soma(valores: number[]): number {
  return arredondar(valores.reduce((total, valor) => total + valor, 0));
}

function percentual(parte: number, base: number): number | null {
  return base > 0 ? Math.round((parte / base) * 10000) / 100 : null;
}

// DRE do mês por competência (regra 12.11). Pedido cancelado não conta. Funções puras, sem banco.
export function calcularDre(entrada: EntradaDaDre): Dre {
  const validos = entrada.pedidos.filter((pedido) => pedido.status !== "CANCELADO");

  const produtos = soma(validos.map((pedido) => pedido.subtotal));

  const descontos = soma(validos.map((pedido) => pedido.descontos));

  const entrega = soma(validos.map((pedido) => pedido.taxaEntrega));

  const receitaTotal = soma(validos.map((pedido) => pedido.total));

  const comissoes = soma(validos.map((pedido) => pedido.comissaoEsperada ?? 0));

  const taxasDoGateway = soma(validos.map((pedido) => pedido.taxaDoGateway ?? 0));

  const impostos = arredondar((receitaTotal * Math.max(0, entrada.impostoPercentual)) / 100);

  const deducoesTotal = arredondar(comissoes + taxasDoGateway + impostos);

  const receitaLiquida = arredondar(receitaTotal - deducoesTotal);

  const cmvTotal = soma(entrada.baixas.map((baixa) => baixa.valor ?? 0));

  const baixasSemCusto = entrada.baixas.filter((baixa) => baixa.valor === null).length;

  const baixasEstimadas = entrada.baixas.filter((baixa) => baixa.valor !== null && !baixa.exato).length;

  const lucroBruto = arredondar(receitaLiquida - cmvTotal);

  const custosFixos = arredondar(entrada.custosFixosDoMes);

  const resultado = arredondar(lucroBruto - custosFixos);

  const semTaxaDoGateway = validos.filter((pedido) => pedido.pagoPorGateway && pedido.taxaDoGateway === undefined).length;

  const avisos: string[] = [];

  if (entrada.impostoPercentual > 0) {
    avisos.push(`Impostos estimados em ${entrada.impostoPercentual}% da receita (percentual da Precificação), não o imposto realmente pago.`);
  } else {
    avisos.push("Impostos zerados: cadastre o percentual na Precificação para a DRE descontá-los.");
  }

  if (baixasEstimadas > 0) {
    avisos.push(`${baixasEstimadas} baixa(s) de estoque de vendas antigas não têm o custo gravado: foram valorizadas pelo custo de hoje (estimativa). As vendas novas já saem com o custo do dia.`);
  }

  if (baixasSemCusto > 0) {
    avisos.push(`${baixasSemCusto} baixa(s) de estoque ficaram sem custo (preparação sem lote): o custo dos produtos está um pouco abaixo do real.`);
  }

  if (semTaxaDoGateway > 0) {
    avisos.push(`${semTaxaDoGateway} pedido(s) pagos pelo Mercado Pago ainda sem a taxa informada: a taxa do gateway está um pouco abaixo do real.`);
  }

  if (validos.length === 0) {
    avisos.push("Sem pedidos no mês.");
  }

  return {
    mes: entrada.mes,
    pedidos: validos.length,
    cancelados: entrada.pedidos.length - validos.length,
    receita: { produtos, descontos, entrega, total: receitaTotal },
    deducoes: { comissoes, taxasDoGateway, impostos, total: deducoesTotal },
    receitaLiquida,
    cmv: { total: cmvTotal, baixasSemCusto, baixasEstimadas },
    lucroBruto,
    custosFixos,
    resultado,
    margemBruta: percentual(lucroBruto, receitaTotal),
    margemDoResultado: percentual(resultado, receitaTotal),
    semTaxaDoGateway,
    avisos,
  };
}
