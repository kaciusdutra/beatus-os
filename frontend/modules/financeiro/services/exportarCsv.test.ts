import { celula, csvDaDre, csvDoCaixa, dataBr, numeroBr } from "./exportarCsv";

import { calcularDre } from "./calcularDre";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

verificar(numeroBr(1234.5) === "1234,50" && numeroBr(-2) === "-2,00" && numeroBr(0.005) === "0,01", "número com vírgula e duas casas");
verificar(celula("Gás; botijão") === '"Gás; botijão"' && celula('Disse "oi"') === '"Disse ""oi"""', "separador e aspas protegidos");
verificar(celula("=SOMA(A1)") === "'=SOMA(A1)" && celula("+55") === "'+55" && celula("@x") === "'@x", "fórmula de planilha neutralizada");
verificar(celula("linha 1\nlinha 2") === "linha 1 linha 2" && celula(undefined) === "", "quebra de linha e vazio");
verificar(dataBr("2026-11-18T15:00:00.000Z") === "18/11/2026", "data em formato brasileiro (Manaus)");

{
  const csv = csvDoCaixa({
    de: "2026-11-01",
    ate: "2026-11-30",
    entradas: 100,
    saidas: 40,
    saldo: 60,
    entradasPorCanal: [],
    entradasPorForma: [],
    saidasPorCategoria: [],
    movimentos: [
      { id: "1", data: "2026-11-18T15:00:00.000Z", tipo: "ENTRADA", origem: "PEDIDO", categoria: "Vendas", descricao: "Pedido 7", valor: 100, forma: "PIX", canal: "CARDAPIO_ONLINE", referenciaNumero: "7" },
      { id: "2", data: "2026-11-19T15:00:00.000Z", tipo: "SAIDA", origem: "LANCAMENTO", categoria: "Gás", descricao: "=cmd()", valor: 40 },
    ],
  });

  const linhas = csv.replace("\uFEFF", "").trim().split("\r\n");

  verificar(csv.startsWith("\uFEFF") && linhas.length === 3, "BOM e uma linha por movimento");
  verificar(linhas[1].endsWith(";100,00") && linhas[2].endsWith(";-40,00"), "entrada positiva, saída negativa");
  verificar(linhas[2].includes("'=cmd()"), "texto perigoso neutralizado no caixa");
}

{
  const dre = calcularDre({ mes: "2026-11", impostoPercentual: 5, custosFixosDoMes: 10, pedidos: [{ canal: "X", status: "ENTREGUE", subtotal: 100, descontos: 0, taxaEntrega: 0, total: 100 }], baixas: [{ valor: 20 }] });

  const csv = csvDaDre(dre);

  verificar(csv.includes("Receita total;100,00") && csv.includes("Resultado do mês;65,00") && csv.includes("Obs.:"), "DRE com valores e observações");
}

console.log(`✅ Testes da exportação CSV passaram (${verificacoes} verificações).`);
