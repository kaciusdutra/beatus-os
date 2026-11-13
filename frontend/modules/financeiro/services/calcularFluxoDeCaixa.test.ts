import {
  calcularFluxoDeCaixa,
  ehMesInteiro,
  repartirCompraPorDestino,
} from "./calcularFluxoDeCaixa";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function executarTestes(): void {
  // Compra: o que não está nos itens (frete, impostos) vai à parte.
  const partes = repartirCompraPorDestino({
    valorTotal: 120,
    itensPorDestino: [
      { destino: "INSUMO", valor: 90 },
      { destino: "EMBALAGEM", valor: 20 },
    ],
  });

  verificar(partes.length === 3, "dois destinos mais o resto");
  verificar(partes[2].destino === "FRETE_E_OUTROS" && partes[2].valor === 10, "resto de R$ 10 é frete e outros");

  const semResto = repartirCompraPorDestino({
    valorTotal: 50,
    itensPorDestino: [{ destino: "INSUMO", valor: 50 }],
  });

  verificar(semResto.length === 1, "sem resto, sem linha extra");

  // Fluxo
  const fluxo = calcularFluxoDeCaixa({
    de: "2026-11-01",
    ate: "2026-11-30",
    pagamentos: [
      { id: "p1", pedidoId: "a", numero: "1", canal: "SITE", forma: "PIX", valor: 100, data: "2026-11-05T20:00:00.000Z" },
      { id: "p2", pedidoId: "b", numero: "2", canal: "IFOOD", forma: "IFOOD", valor: 60.5, data: "2026-11-06T20:00:00.000Z" },
      { id: "p3", pedidoId: "c", numero: "3", canal: "SITE", forma: "PIX", valor: 40, data: "2026-11-07T20:00:00.000Z" },
    ],
    compras: [
      {
        id: "c1",
        fornecedor: "Fornecedor X",
        valorTotal: 120,
        forma: "PIX",
        data: "2026-11-04T12:00:00.000Z",
        itensPorDestino: [{ destino: "INSUMO", valor: 110 }],
      },
    ],
    lancamentos: [
      { id: "l1", tipo: "SAIDA", categoria: "Gás", descricao: "Botijão", valor: 130, data: "2026-11-08T12:00:00.000Z", forma: "DINHEIRO", cancelado: false },
      { id: "l2", tipo: "SAIDA", categoria: "Gás", descricao: "Lançado errado", valor: 999, data: "2026-11-08T13:00:00.000Z", cancelado: true },
      { id: "l3", tipo: "ENTRADA", categoria: "Aporte do sócio", descricao: "Aporte", valor: 200, data: "2026-11-02T12:00:00.000Z", forma: "PIX", cancelado: false },
    ],
    custosFixosPrevistos: 1000,
  });

  verificar(fluxo.entradas === 400.5, `entradas 400,50 (veio ${fluxo.entradas})`);
  verificar(fluxo.saidas === 250, `saídas 250 (veio ${fluxo.saidas})`);
  verificar(fluxo.saldo === 150.5, `saldo 150,50 (veio ${fluxo.saldo})`);
  verificar(fluxo.saldoComPrevisto === -849.5, "saldo com custos fixos previstos");
  verificar(fluxo.movimentos.length === 6, "lançamento cancelado não entra");
  verificar(fluxo.movimentos[0].id === "lancamento-l1", "ordem do mais novo para o mais antigo");
  verificar(fluxo.entradasPorCanal.some((item) => item.chave === "SITE" && item.valor === 140), "SITE soma 140");
  verificar(fluxo.entradasPorForma.some((item) => item.chave === "PIX" && item.valor === 340), "PIX soma 340");
  verificar(fluxo.saidasPorCategoria.some((item) => item.chave === "Gás" && item.valor === 130), "gás 130");
  verificar(fluxo.saidasPorCategoria.some((item) => item.chave === "Compra: frete, impostos e outras despesas" && item.valor === 10), "frete da compra à parte");

  const semPrevisto = calcularFluxoDeCaixa({ de: "2026-11-01", ate: "2026-11-02", pagamentos: [], compras: [], lancamentos: [] });

  verificar(semPrevisto.saldo === 0 && semPrevisto.saldoComPrevisto === undefined, "vazio: saldo zero, sem previsto");

  // Título pago: a saída é na data do pagamento, repartida pelos destinos da compra; juros à parte.
  const comTitulo = calcularFluxoDeCaixa({
    de: "2026-12-01",
    ate: "2026-12-31",
    pagamentos: [],
    compras: [],
    lancamentos: [],
    titulosPagos: [
      {
        id: "t1",
        fornecedor: "Fornecedor X",
        parcela: 1,
        totalParcelas: 2,
        valor: 500,
        valorPago: 510,
        pagoEm: "2026-12-10T12:00:00.000Z",
        forma: "PIX",
        entradaCompraId: "c9",
        compraValorTotal: 1000,
        compraItensPorDestino: [
          { destino: "INSUMO", valor: 800 },
          { destino: "EMBALAGEM", valor: 200 },
        ],
      },
    ],
  });

  verificar(comTitulo.saidas === 510, "a saída é o valor pago (510)");
  verificar(comTitulo.movimentos[0].origem === "TITULO", "movimento de origem título");
  verificar(comTitulo.saidasPorCategoria.some((item) => item.chave === "Compra: insumos" && item.valor === 400), "80% do título em insumos");
  verificar(comTitulo.saidasPorCategoria.some((item) => item.chave === "Compra: embalagens" && item.valor === 100), "20% do título em embalagens");
  verificar(comTitulo.saidasPorCategoria.some((item) => item.chave === "Juros, multas e descontos" && item.valor === 10), "juros de R$ 10 à parte");

  // Repasse de marketplace: entra no valor e na data conferidos, com canal.
  const comRepasse = calcularFluxoDeCaixa({
    de: "2026-12-01",
    ate: "2026-12-31",
    pagamentos: [],
    compras: [],
    lancamentos: [],
    repasses: [
      { id: "r1", pedidoId: "p9", numero: "9", canal: "IFOOD", forma: "REPASSE", valor: 84.5, data: "2026-12-05T12:00:00.000Z" },
    ],
  });

  verificar(comRepasse.entradas === 84.5, "o repasse entra pelo valor recebido");
  verificar(comRepasse.movimentos[0].origem === "REPASSE" && comRepasse.movimentos[0].canal === "IFOOD", "movimento de repasse do iFood");
  verificar(comRepasse.entradasPorCanal.some((item) => item.chave === "IFOOD" && item.valor === 84.5), "entrada por canal");
  verificar(comRepasse.entradasPorForma.some((item) => item.chave === "Repasse"), "forma Repasse");

  // Mês inteiro
  verificar(ehMesInteiro("2026-11-01", "2026-11-30"), "novembro inteiro");
  verificar(ehMesInteiro("2026-02-01", "2026-02-28"), "fevereiro de 2026 inteiro");
  verificar(!ehMesInteiro("2026-11-01", "2026-11-29"), "falta um dia");
  verificar(!ehMesInteiro("2026-11-02", "2026-11-30"), "começa no dia 2");
  verificar(!ehMesInteiro("2026-10-01", "2026-11-30"), "dois meses");
}

executarTestes();

console.log(`✅ Testes do fluxo de caixa passaram (${verificacoes} verificações).`);
