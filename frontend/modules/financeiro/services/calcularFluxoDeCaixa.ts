import type { TituloPago } from "../types/contasAPagar";

import type {
  CompraPaga,
  FluxoDeCaixa,
  LancamentoManual,
  MovimentoDeCaixa,
  PagamentoRecebido,
  TotalPorChave,
} from "../types/fluxoDeCaixa";

const ROTULO_DESTINO: Record<string, string> = {
  INSUMO: "Compra: insumos",
  EMBALAGEM: "Compra: embalagens",
  LIMPEZA_HIGIENE: "Compra: limpeza e higiene",
  EXPEDIENTE: "Compra: expediente",
  EQUIPAMENTO_UTENSILIO: "Compra: equipamento e utensílio",
  SERVICO: "Compra: serviços",
  SEM_DESTINO: "Compra: sem destino",
  FRETE_E_OUTROS: "Compra: frete, impostos e outras despesas",
};

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function somarPorChave(
  itens: { chave: string; valor: number }[]
): TotalPorChave[] {
  const mapa = new Map<string, number>();

  for (const item of itens) {
    mapa.set(item.chave, (mapa.get(item.chave) ?? 0) + item.valor);
  }

  return [...mapa.entries()]
    .map(([chave, valor]) => ({ chave, valor: arredondar(valor) }))
    .sort((a, b) => b.valor - a.valor);
}

// Parte o valor total de uma compra pelos destinos dos itens; o que sobra
// (frete, impostos, outras despesas da nota) vai em "FRETE_E_OUTROS".
export function repartirCompraPorDestino(
  compra: Pick<CompraPaga, "valorTotal" | "itensPorDestino">
): { destino: string; valor: number }[] {
  const partes = compra.itensPorDestino.map((item) => ({
    destino: item.destino || "SEM_DESTINO",
    valor: item.valor,
  }));

  const somaDosItens = partes.reduce((soma, parte) => soma + parte.valor, 0);

  const resto = arredondar(compra.valorTotal - somaDosItens);

  if (resto > 0.004) {
    partes.push({ destino: "FRETE_E_OUTROS", valor: resto });
  } else if (partes.length === 0) {
    partes.push({ destino: "SEM_DESTINO", valor: compra.valorTotal });
  }

  return partes;
}

export function rotuloDoDestino(destino: string): string {
  return ROTULO_DESTINO[destino] ?? `Compra: ${destino}`;
}

export interface EntradasDoFluxo {
  de: string;
  ate: string;
  pagamentos: PagamentoRecebido[];
  compras: CompraPaga[];
  lancamentos: LancamentoManual[];
  // Títulos a pagar (compras a prazo) pagos no período: a saída é na data do pagamento.
  titulosPagos?: TituloPago[];
  custosFixosPrevistos?: number;
}

// Fluxo de caixa de um período: o que entrou (pagamentos aprovados de pedidos
// e receitas avulsas), o que saiu (compras pagas e despesas avulsas) e o saldo.
// Lançamentos cancelados não contam.
export function calcularFluxoDeCaixa(
  entrada: EntradasDoFluxo
): FluxoDeCaixa {
  const movimentos: MovimentoDeCaixa[] = [];

  const entradasCanal: { chave: string; valor: number }[] = [];
  const entradasForma: { chave: string; valor: number }[] = [];
  const saidasCategoria: { chave: string; valor: number }[] = [];

  for (const pagamento of entrada.pagamentos) {
    movimentos.push({
      id: `pedido-${pagamento.id}`,
      data: pagamento.data,
      tipo: "ENTRADA",
      origem: "PEDIDO",
      categoria: "Venda",
      descricao: `Pedido ${pagamento.numero}`,
      valor: pagamento.valor,
      forma: pagamento.forma,
      canal: pagamento.canal,
      referenciaId: pagamento.pedidoId,
      referenciaNumero: pagamento.numero,
    });

    entradasCanal.push({ chave: pagamento.canal, valor: pagamento.valor });
    entradasForma.push({ chave: pagamento.forma, valor: pagamento.valor });
  }

  for (const compra of entrada.compras) {
    movimentos.push({
      id: `compra-${compra.id}`,
      data: compra.data,
      tipo: "SAIDA",
      origem: "COMPRA",
      categoria: "Compra",
      descricao: `Compra de ${compra.fornecedor}${compra.numeroDocumento ? ` (doc. ${compra.numeroDocumento})` : ""}`,
      valor: compra.valorTotal,
      forma: compra.forma,
      referenciaId: compra.id,
      referenciaNumero: compra.numeroDocumento,
    });

    for (const parte of repartirCompraPorDestino(compra)) {
      saidasCategoria.push({
        chave: rotuloDoDestino(parte.destino),
        valor: parte.valor,
      });
    }
  }

  for (const titulo of entrada.titulosPagos ?? []) {
    movimentos.push({
      id: `titulo-${titulo.id}`,
      data: titulo.pagoEm,
      tipo: "SAIDA",
      origem: "TITULO",
      categoria: "Título a pagar",
      descricao: `Título ${titulo.parcela}/${titulo.totalParcelas} de ${titulo.fornecedor}${titulo.numeroDocumento ? ` (doc. ${titulo.numeroDocumento})` : ""}`,
      valor: titulo.valorPago,
      forma: titulo.forma,
      referenciaId: titulo.entradaCompraId,
      referenciaNumero: titulo.numeroDocumento,
    });

    // A saída se reparte pelos destinos da compra, na proporção do título;
    // juros, multa e desconto ficam à parte.
    const partes =
      titulo.compraValorTotal && titulo.compraItensPorDestino
        ? repartirCompraPorDestino({
            valorTotal: titulo.compraValorTotal,
            itensPorDestino: titulo.compraItensPorDestino,
          })
        : [{ destino: "SEM_DESTINO", valor: titulo.valor }];

    const totalDasPartes = partes.reduce((soma, parte) => soma + parte.valor, 0) || 1;

    for (const parte of partes) {
      saidasCategoria.push({
        chave: rotuloDoDestino(parte.destino),
        valor: (parte.valor / totalDasPartes) * titulo.valor,
      });
    }

    const diferenca = arredondar(titulo.valorPago - titulo.valor);

    if (diferenca !== 0) {
      saidasCategoria.push({ chave: "Juros, multas e descontos", valor: diferenca });
    }
  }

  for (const lancamento of entrada.lancamentos) {
    if (lancamento.cancelado) {
      continue;
    }

    movimentos.push({
      id: `lancamento-${lancamento.id}`,
      data: lancamento.data,
      tipo: lancamento.tipo,
      origem: "LANCAMENTO",
      categoria: lancamento.categoria,
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      forma: lancamento.forma,
      referenciaId: lancamento.id,
    });

    if (lancamento.tipo === "ENTRADA") {
      entradasCanal.push({ chave: "Avulso", valor: lancamento.valor });
      entradasForma.push({
        chave: lancamento.forma ?? "Não informada",
        valor: lancamento.valor,
      });
    } else {
      saidasCategoria.push({
        chave: lancamento.categoria,
        valor: lancamento.valor,
      });
    }
  }

  movimentos.sort((a, b) => b.data.localeCompare(a.data));

  const entradas = arredondar(
    movimentos
      .filter((movimento) => movimento.tipo === "ENTRADA")
      .reduce((soma, movimento) => soma + movimento.valor, 0)
  );

  const saidas = arredondar(
    movimentos
      .filter((movimento) => movimento.tipo === "SAIDA")
      .reduce((soma, movimento) => soma + movimento.valor, 0)
  );

  const saldo = arredondar(entradas - saidas);

  return {
    de: entrada.de,
    ate: entrada.ate,
    movimentos,
    entradas,
    saidas,
    saldo,
    entradasPorCanal: somarPorChave(entradasCanal),
    entradasPorForma: somarPorChave(entradasForma),
    saidasPorCategoria: somarPorChave(saidasCategoria),
    custosFixosPrevistos: entrada.custosFixosPrevistos,
    saldoComPrevisto:
      entrada.custosFixosPrevistos === undefined
        ? undefined
        : arredondar(saldo - entrada.custosFixosPrevistos),
  };
}

// O período é um mês inteiro? (AAAA-MM-DD, do dia 1 ao último dia do mês)
export function ehMesInteiro(de: string, ate: string): boolean {
  const [anoDe, mesDe, diaDe] = de.split("-").map(Number);

  const [anoAte, mesAte, diaAte] = ate.split("-").map(Number);

  if (!anoDe || !mesDe || !diaDe || !anoAte || !mesAte || !diaAte) {
    return false;
  }

  const ultimoDia = new Date(anoDe, mesDe, 0).getDate();

  return anoDe === anoAte && mesDe === mesAte && diaDe === 1 && diaAte === ultimoDia;
}
