import { calcularDre } from "./calcularDre";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const dre = calcularDre({
  mes: "2026-11",
  impostoPercentual: 5,
  custosFixosDoMes: 300,
  pedidos: [
    { canal: "CARDAPIO_ONLINE", status: "ENTREGUE", subtotal: 100, descontos: 10, taxaEntrega: 10, total: 100, taxaDoGateway: 4, pagoPorGateway: true },
    { canal: "CARDAPIO_ONLINE", status: "ENTREGUE", subtotal: 50, descontos: 0, taxaEntrega: 0, total: 50, pagoPorGateway: true },
    { canal: "IFOOD", status: "ENTREGUE", subtotal: 100, descontos: 0, taxaEntrega: 0, total: 100, comissaoEsperada: 25 },
    { canal: "CARDAPIO_ONLINE", status: "CANCELADO", subtotal: 999, descontos: 0, taxaEntrega: 0, total: 999 },
  ],
  baixas: [{ valor: 30 }, { valor: 12.5 }, { valor: -2.5 }, { valor: null }],
});

verificar(dre.pedidos === 3 && dre.cancelados === 1, "cancelado fica fora da conta e é contado");
verificar(dre.receita.produtos === 250 && dre.receita.descontos === 10 && dre.receita.entrega === 10 && dre.receita.total === 250, "receita");
verificar(dre.deducoes.comissoes === 25 && dre.deducoes.taxasDoGateway === 4 && dre.deducoes.impostos === 12.5 && dre.deducoes.total === 41.5, "deduções: comissão, taxa real e imposto estimado");
verificar(dre.receitaLiquida === 208.5, "receita líquida");
verificar(dre.cmv.baixasEstimadas === 3, "baixas sem custo gravado contam como estimadas");
verificar(dre.cmv.total === 40 && dre.cmv.baixasSemCusto === 1, "CMV soma o devolvido com sinal e conta o que ficou sem custo");
verificar(dre.lucroBruto === 168.5 && dre.resultado === -131.5, "lucro bruto e resultado depois dos custos fixos");
verificar(dre.margemBruta === 67.4 && dre.margemDoResultado === -52.6, "margens em % da receita");
verificar(dre.semTaxaDoGateway === 1, "pedido do gateway sem taxa informada é contado");
verificar(dre.avisos.some((aviso) => aviso.includes("estimativa")) && dre.avisos.some((aviso) => aviso.includes("sem custo")) && dre.avisos.some((aviso) => aviso.includes("sem a taxa")), "avisos honestos");

{
  const exato = calcularDre({ mes: "2026-11", impostoPercentual: 0, custosFixosDoMes: 0, pedidos: [], baixas: [{ valor: 10, exato: true }, { valor: -2, exato: true }] });

  verificar(exato.cmv.total === 8 && exato.cmv.baixasEstimadas === 0 && !exato.avisos.some((aviso) => aviso.includes("estimativa")), "com custo gravado não há aviso de estimativa do custo");

  const vazio = calcularDre({ mes: "2026-11", impostoPercentual: 0, custosFixosDoMes: 0, pedidos: [], baixas: [] });

  verificar(vazio.receita.total === 0 && vazio.margemBruta === null && vazio.resultado === 0, "mês sem pedidos não divide por zero");
  verificar(vazio.avisos.some((aviso) => aviso.includes("Impostos zerados")), "avisa imposto zerado");
}

console.log(`✅ Testes da DRE passaram (${verificacoes} verificações).`);
