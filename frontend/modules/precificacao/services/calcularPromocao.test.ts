import {
  avisoDeImpacto,
  compararComboComAvulso,
  descontoMaximoDoCombo,
  economiaDoCombo,
  parametrosDoCanal,
  precoDaPromocao,
  simularPromocao,
} from "./calcularPromocao";

import { PARAMETROS_PADRAO } from "../types/precificacao";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function perto(a: number | undefined, b: number, folga = 0.01) {
  return a !== undefined && Math.abs(a - b) <= folga;
}

function executarTestes(): void {
  const custos = {
    custoFicha: 14,
    embalagemPedido: 0,
    custoFixoPorPedido: 0,
    itensPorPedido: 1,
    taxaCanalPorPedido: 0,
  };

  const sem = {
    comissaoPercentual: 0,
    impostoPercentual: 0,
    taxaPagamentoPercentual: 0,
  };

  // Preço da promoção
  verificar(
    precoDaPromocao(40, { tipo: "PERCENTUAL", valor: 15 }) === 34,
    "15% de desconto em R$ 40 = R$ 34"
  );

  verificar(
    precoDaPromocao(40, { tipo: "PRECO", valor: 32.9 }) === 32.9,
    "preço promocional direto"
  );

  verificar(
    precoDaPromocao(40, { tipo: "PERCENTUAL", valor: 100 }) === undefined,
    "100% de desconto não é preço"
  );

  // Simulação: R$ 40 com custo R$ 14, desconto de 15% (R$ 34)
  const simulacao = simularPromocao(
    40,
    { tipo: "PERCENTUAL", valor: 15 },
    custos,
    sem
  );

  verificar(
    perto(simulacao?.normal.lucro, 26) &&
      perto(simulacao?.promocional.lucro, 20),
    "lucro normal R$ 26 e promocional R$ 20"
  );

  verificar(
    perto(simulacao?.descontoReais, 6) &&
      perto(simulacao?.descontoPercentual, 15),
    "desconto em R$ e %"
  );

  // Volume: 26 / 20 - 1 = 30% a mais de pedidos
  verificar(
    perto(simulacao?.volumeParaCompensarPercentual, 30, 0.1),
    "30% a mais de pedidos compensam o desconto"
  );

  // Promoção sem lucro: nenhum volume compensa
  const semLucro = simularPromocao(
    40,
    { tipo: "PRECO", valor: 13 },
    custos,
    sem
  );

  verificar(
    semLucro?.volumeParaCompensarPercentual === undefined &&
      (semLucro?.promocional.margemPercentual ?? 0) < 0,
    "preço abaixo do custo não tem volume que compense"
  );

  // Promoção com preço maior que o normal: sem volume extra
  const aumento = simularPromocao(
    40,
    { tipo: "PRECO", valor: 45 },
    custos,
    sem
  );

  verificar(
    aumento?.volumeParaCompensarPercentual === 0,
    "preço maior não pede volume extra"
  );

  // Canal: comissão e taxa por pedido
  const { percentuais, taxaCanalPorPedido } = parametrosDoCanal(
    { ...PARAMETROS_PADRAO, impostoPercentual: 4 },
    {
      canal: "IFOOD",
      comissaoPercentual: 25.2,
      taxaMensal: 150,
      pedidosMensaisEstimados: 300,
      ativo: true,
    }
  );

  verificar(
    percentuais.comissaoPercentual === 25.2 &&
      percentuais.impostoPercentual === 4 &&
      perto(taxaCanalPorPedido, 0.5),
    "parâmetros do canal"
  );

  // Combo: burger R$ 49 + batata R$ 15 + bebida R$ 8 = R$ 72 avulso; combo R$ 64,90
  const combo = economiaDoCombo([49, 15, 8], 64.9);

  verificar(
    combo?.somaAvulsa === 72 &&
      perto(combo?.economiaReais, 7.1) &&
      perto(combo?.economiaPercentual, 9.86),
    "economia do combo"
  );

  verificar(
    economiaDoCombo([], 50) === undefined,
    "combo sem itens não tem economia"
  );

  // Aviso de impacto
  const subiu = avisoDeImpacto({
    custoReferencia: 14,
    margemReferencia: 30,
    custoAtual: 15.2,
    margemAtual: 27.6,
    margemMinimaPercentual: 20,
  });

  verificar(
    subiu?.tipos.join(",") === "CUSTO_SUBIU" &&
      perto(subiu.variacaoDoCustoPercentual, 8.57),
    "custo subiu 8,57%"
  );

  verificar(
    avisoDeImpacto({
      custoReferencia: 14,
      margemReferencia: 30,
      custoAtual: 14.5,
      margemAtual: 28,
      margemMinimaPercentual: 20,
    }) === undefined,
    "alta de 3,6% abaixo do limite não avisa"
  );

  verificar(
    avisoDeImpacto({
      custoReferencia: 14,
      margemReferencia: 30,
      custoAtual: 16,
      margemAtual: 18,
      margemMinimaPercentual: 20,
    })?.tipos.join(",") === "CUSTO_SUBIU,ABAIXO_DA_MINIMA",
    "custo subiu e margem caiu abaixo da mínima"
  );

  verificar(
    avisoDeImpacto({
      custoAtual: 14,
      margemAtual: 12,
      margemMinimaPercentual: 20,
    })?.tipos.join(",") === "ABAIXO_DA_MINIMA",
    "sem referência, margem abaixo da mínima avisa"
  );

  // Promoção conhecida: preço fixado já abaixo da mínima e custo estável
  verificar(
    avisoDeImpacto({
      custoReferencia: 14,
      margemReferencia: 15,
      custoAtual: 14.2,
      margemAtual: 14,
      margemMinimaPercentual: 20,
    }) === undefined,
    "promoção conhecida não avisa de novo"
  );

  verificar(
    avisoDeImpacto({
      custoReferencia: 14,
      margemReferencia: 15,
      custoAtual: 14.2,
      margemAtual: -2,
      margemMinimaPercentual: 20,
    })?.tipos.join(",") === "PREJUIZO",
    "prejuízo sempre avisa"
  );

  // Desconto máximo do combo: soma avulsa R$ 72, custo R$ 20, margem mínima 20%
  // preço mínimo = 20 / 0,8 = R$ 25 => pode baixar R$ 47 (65,28%)
  const maximo = descontoMaximoDoCombo(
    72,
    { ...custos, custoFicha: 20 },
    sem,
    20
  );

  verificar(
    perto(maximo?.precoMinimo, 25) &&
      perto(maximo?.descontoMaximoReais, 47) &&
      perto(maximo?.descontoMaximoPercentual, 65.28),
    "desconto máximo do combo"
  );

  verificar(
    descontoMaximoDoCombo(10, { ...custos, custoFicha: 20 }, sem, 20)
      ?.descontoMaximoReais === 0,
    "combo já abaixo do preço mínimo não tem desconto"
  );

  // Combo contra avulso: burger R$ 49 (custo 14), batata R$ 15 (custo 3),
  // bebida R$ 8 (custo 2); combo a R$ 64,90 com custo 19
  const comparacao = compararComboComAvulso(
    { preco: 64.9, custos: { ...custos, custoFicha: 19 } },
    [
      { preco: 49, custos: { ...custos, custoFicha: 14 } },
      { preco: 15, custos: { ...custos, custoFicha: 3 } },
      { preco: 8, custos: { ...custos, custoFicha: 2 } },
    ],
    sem
  );

  // lucro avulso = 35 + 12 + 6 = 53 de 72 (73,61%); combo = 45,90 de 64,90 (70,72%)
  verificar(
    perto(comparacao?.lucroAvulso, 53) &&
      perto(comparacao?.margemAvulsa, 73.61) &&
      perto(comparacao?.margemCombo, 70.72) &&
      perto(comparacao?.diferencaEmPontos, -2.89),
    "margem do combo contra a dos itens avulsos"
  );

  console.log(
    `✅ Testes da promoção e do impacto passaram (${verificacoes} verificações).`
  );
}

try {
  executarTestes();
} catch (error) {
  console.error("❌ Testes da promoção e do impacto falharam:");
  console.error(error);
  process.exitCode = 1;
}
