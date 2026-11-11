import {
  custoTotalDoProduto,
  lerMargensCenario,
  precoComercial,
  precoParaMargem,
  resultadoDoPreco,
  somaPercentuais,
} from "./calcularPreco";

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
  const semPercentuais = {
    comissaoPercentual: 0,
    impostoPercentual: 0,
    taxaPagamentoPercentual: 0,
  };

  // Custo total: R$ 14 da ficha + (R$ 1 de embalagem + R$ 2 de fixo) / 1,5 itens
  verificar(
    perto(
      custoTotalDoProduto({
        custoFicha: 14,
        embalagemPedido: 1,
        custoFixoPorPedido: 2,
        itensPorPedido: 1.5,
        taxaCanalPorPedido: 0,
      }),
      16
    ),
    "custo total rateia o que é por pedido"
  );

  // Itens por pedido inválido volta para 1
  verificar(
    custoTotalDoProduto({
      custoFicha: 10,
      embalagemPedido: 2,
      custoFixoPorPedido: 0,
      itensPorPedido: 0,
      taxaCanalPorPedido: 0,
    }) === 12,
    "itens por pedido zero conta como 1"
  );

  // Preço para margem, venda direta: R$ 14 com 30% de margem = R$ 20
  verificar(
    perto(precoParaMargem(14, semPercentuais, 30), 20),
    "R$ 14 com 30% de margem = R$ 20"
  );

  // Com 25,2% de comissão: R$ 14 / (1 - 0,30 - 0,252) = R$ 31,25
  verificar(
    perto(
      precoParaMargem(
        14,
        { ...semPercentuais, comissaoPercentual: 25.2 },
        30
      ),
      31.25
    ),
    "margem 30% com comissão de 25,2%"
  );

  // Impossível: percentuais + margem >= 100%
  verificar(
    precoParaMargem(
      14,
      { ...semPercentuais, comissaoPercentual: 70 },
      30
    ) === undefined,
    "percentuais e margem passando de 100% não têm preço"
  );

  // A margem do preço calculado volta ao valor pedido
  const custos = {
    custoFicha: 14,
    embalagemPedido: 0,
    custoFixoPorPedido: 0,
    itensPorPedido: 1,
    taxaCanalPorPedido: 0,
  };

  const percentuais = {
    comissaoPercentual: 25.2,
    impostoPercentual: 4,
    taxaPagamentoPercentual: 1,
  };

  const preco = precoParaMargem(
    custoTotalDoProduto(custos),
    percentuais,
    25
  );

  const resultado = resultadoDoPreco(preco ?? 0, custos, percentuais);

  verificar(
    perto(resultado?.margemPercentual, 25, 0.05),
    "o preço calculado devolve a margem pedida"
  );

  // Resultado de um preço livre: venda direta R$ 44,90, custo R$ 14
  const direto = resultadoDoPreco(44.9, custos, semPercentuais);

  verificar(
    perto(direto?.lucro, 30.9) &&
      perto(direto?.margemPercentual, 68.82) &&
      perto(direto?.cmvPercentual, 31.18) &&
      perto(direto?.markupPercentual, 220.71),
    "CMV, markup e margem de um preço livre"
  );

  // Promoção: preço abaixo do custo dá margem negativa
  verificar(
    (resultadoDoPreco(12, custos, semPercentuais)?.margemPercentual ??
      0) < 0,
    "preço abaixo do custo dá prejuízo"
  );

  verificar(
    resultadoDoPreco(0, custos, semPercentuais) === undefined,
    "preço zero não tem resultado"
  );

  verificar(
    somaPercentuais(percentuais) === 30.2,
    "soma dos percentuais"
  );

  // Preço comercial: sobe até o próximo ,90
  verificar(precoComercial(44.37) === 44.9, "44,37 vira 44,90");
  verificar(precoComercial(44.9) === 44.9, "44,90 fica 44,90");
  verificar(precoComercial(44.95) === 45.9, "44,95 vira 45,90");
  verificar(precoComercial(20) === 20.9, "20,00 vira 20,90");

  // Margens do cenário
  const margens = lerMargensCenario("35, 20; 25 30 20");

  verificar(
    margens.join(",") === "20,25,30,35",
    "margens ordenadas e sem repetir"
  );

  let recusou = false;

  try {
    lerMargensCenario("20, abc");
  } catch {
    recusou = true;
  }

  verificar(recusou, "margem inválida é recusada");

  console.log(
    `✅ Testes do cálculo de preço passaram (${verificacoes} verificações).`
  );
}

try {
  executarTestes();
} catch (error) {
  console.error("❌ Testes do cálculo de preço falharam:");
  console.error(error);
  process.exitCode = 1;
}
