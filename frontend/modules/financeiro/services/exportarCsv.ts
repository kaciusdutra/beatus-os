import type { FluxoDeCaixa } from "../types/fluxoDeCaixa";

import type { Dre } from "../types/dre";

// CSV para o contador: separador ponto e vírgula, decimal com vírgula e BOM, para abrir direto no Excel em português.
const BOM = "\uFEFF";

const ROTULO_DA_ORIGEM: Record<string, string> = {
  PEDIDO: "Venda (pedido)",
  REPASSE: "Repasse de marketplace",
  COMPRA: "Compra à vista",
  TITULO: "Título pago",
  LANCAMENTO: "Lançamento avulso",
};

// Texto de célula: aspas dobradas e, contra injeção de fórmula no Excel, prefixo quando começa com = + - @ ou tabulação.
export function celula(valor: string | undefined): string {
  let texto = (valor ?? "").replace(/\r?\n/g, " ").trim();

  if (/^[=+\-@\t]/.test(texto)) {
    texto = `'${texto}`;
  }

  return /[";]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function numeroBr(valor: number): string {
  return (Math.round(valor * 100) / 100).toFixed(2).replace(".", ",");
}

export function dataBr(iso: string): string {
  const data = new Date(iso);

  if (Number.isNaN(data.getTime())) {
    return iso;
  }

  return data.toLocaleDateString("pt-BR", { timeZone: "America/Manaus" });
}

function linhas(cabecalho: string[], corpo: string[][]): string {
  return BOM + [cabecalho, ...corpo].map((linha) => linha.join(";")).join("\r\n") + "\r\n";
}

// Livro-caixa do período: cada entrada e saída, na data em que o dinheiro se moveu.
export function csvDoCaixa(fluxo: FluxoDeCaixa): string {
  return linhas(
    ["Data", "Tipo", "Origem", "Categoria", "Descrição", "Forma", "Canal", "Referência", "Valor"],
    fluxo.movimentos.map((movimento) => [
      dataBr(movimento.data),
      movimento.tipo === "ENTRADA" ? "Entrada" : "Saída",
      celula(ROTULO_DA_ORIGEM[movimento.origem] ?? movimento.origem),
      celula(movimento.categoria),
      celula(movimento.descricao),
      celula(movimento.forma),
      celula(movimento.canal),
      celula(movimento.referenciaNumero),
      numeroBr(movimento.tipo === "ENTRADA" ? movimento.valor : -movimento.valor),
    ])
  );
}

// DRE do mês em duas colunas.
export function csvDaDre(dre: Dre): string {
  const corpo: [string, number][] = [
    ["Produtos vendidos", dre.receita.produtos],
    ["(-) Descontos (já abatidos do total)", dre.receita.descontos],
    ["Taxa de entrega cobrada", dre.receita.entrega],
    ["Receita total", dre.receita.total],
    ["(-) Comissões dos marketplaces", -dre.deducoes.comissoes],
    ["(-) Taxas do Mercado Pago", -dre.deducoes.taxasDoGateway],
    ["(-) Impostos (estimados)", -dre.deducoes.impostos],
    ["Receita líquida", dre.receitaLiquida],
    ["(-) Custo dos produtos vendidos (estimado)", -dre.cmv.total],
    ["Lucro bruto", dre.lucroBruto],
    ["(-) Custos fixos do mês", -dre.custosFixos],
    ["Resultado do mês", dre.resultado],
  ];

  return (
    linhas([`DRE ${dre.mes}`, "Valor"], corpo.map(([rotulo, valor]) => [celula(rotulo), numeroBr(valor)])) +
    dre.avisos.map((aviso) => `${celula(`Obs.: ${aviso}`)};`).join("\r\n") +
    "\r\n"
  );
}
