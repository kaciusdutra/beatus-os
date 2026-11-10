import {
  aplicarPrecoNoInsumo,
  calcularCustoDaCompra,
  ordenarHistorico,
} from "./custoDaCompra";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function executarTestes(): void {
  // Mesma unidade: 2 kg por R$ 80 = R$ 40 o quilo
  const kg = calcularCustoDaCompra(
    { quantidade: 2, unidade: "KG", valorTotal: 80 },
    { unidadeCompra: "kg" }
  );

  verificar(kg.ok && kg.precoPorUnidade === 40, "R$ 40 o quilo");

  // Família de unidade: 500 g por R$ 20, insumo em kg
  const g = calcularCustoDaCompra(
    { quantidade: 500, unidade: "g", valorTotal: 20 },
    { unidadeCompra: "kg" }
  );

  verificar(
    g.ok &&
      g.quantidadeConvertida === 0.5 &&
      g.precoPorUnidade === 40,
    "500 g viram 0,5 kg"
  );

  // Equivalência: 3 pct, 1 pct = 6 un; insumo em un
  const pct = calcularCustoDaCompra(
    { quantidade: 3, unidade: "pct", valorTotal: 36 },
    {
      unidadeCompra: "un",
      equivalenciaQuantidade: 1,
      equivalenciaUnidade: "pct",
    }
  );

  verificar(
    pct.ok && pct.precoPorUnidade === 12,
    "equivalência cadastrada em pct"
  );

  // Equivalência na ponta de uso: compra em un, insumo em pct (1 pct = 6 un)
  const un = calcularCustoDaCompra(
    { quantidade: 12, unidade: "un", valorTotal: 24 },
    {
      unidadeCompra: "pct",
      equivalenciaQuantidade: 6,
      equivalenciaUnidade: "un",
    }
  );

  verificar(
    un.ok &&
      un.quantidadeConvertida === 2 &&
      un.precoPorUnidade === 12,
    "12 un = 2 pct a R$ 12 cada"
  );

  // Sem conversão: não calcula e explica
  const sem = calcularCustoDaCompra(
    { quantidade: 1, unidade: "cx", valorTotal: 50 },
    { unidadeCompra: "kg" }
  );

  verificar(
    !sem.ok && sem.motivo.includes("equivalência"),
    "unidade incompatível avisa"
  );

  // Bonificação e quantidade inválida
  verificar(
    !calcularCustoDaCompra(
      { quantidade: 1, unidade: "kg", valorTotal: 0 },
      { unidadeCompra: "kg" }
    ).ok,
    "valor zero não define custo"
  );

  verificar(
    !calcularCustoDaCompra(
      { quantidade: 0, unidade: "kg", valorTotal: 10 },
      { unidadeCompra: "kg" }
    ).ok,
    "quantidade zero"
  );

  // Preço no insumo: mantém a quantidade de compra
  const aplicado = aplicarPrecoNoInsumo(0.5, 40);

  verificar(
    aplicado.precoCompra === 20 && aplicado.custoUnitario === 40,
    "quantidade de compra mantida"
  );

  // Última compra: por data
  const ordenado = ordenarHistorico([
    {
      dataCompra: "2026-11-10T00:00:00.000Z",
      criadoEm: "2026-11-11T00:00:00.000Z",
      precoPorUnidade: 1,
      custoAnterior: 0,
    },
    {
      dataCompra: "2026-11-01T00:00:00.000Z",
      criadoEm: "2026-11-12T00:00:00.000Z",
      precoPorUnidade: 2,
      custoAnterior: 0,
    },
  ]);

  verificar(
    ordenado[ordenado.length - 1].precoPorUnidade === 1,
    "a data manda, não a hora de gravar"
  );

  console.log(
    `✅ Testes do custo da compra passaram (${verificacoes} verificações).`
  );
}

try {
  executarTestes();
} catch (error) {
  console.error("❌ Testes do custo da compra falharam:");
  console.error(error);
  process.exitCode = 1;
}
