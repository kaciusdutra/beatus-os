import type {
  ConferenciaDoDia,
  LinhaDoCanal,
  PedidoDoDia,
  SituacaoDoCanal,
} from "../types/conferenciaDoDia";

const MARKETPLACES = ["IFOOD", "99FOOD", "KEETA"];

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function ehMarketplace(canal: string): boolean {
  return MARKETPLACES.includes(canal);
}

// Conferência do dia por canal. Pedido cancelado não conta nas vendas; fica só
// como contagem. Nos canais próprios, o que entrou são os pagamentos aprovados
// dos pedidos; nos marketplaces, os repasses já conferidos, e o que ainda não
// foi conferido aparece como "a receber" (valor líquido esperado).
export function conferirDia(data: string, pedidos: PedidoDoDia[]): ConferenciaDoDia {
  const mapa = new Map<string, PedidoDoDia[]>();

  for (const pedido of pedidos) {
    mapa.set(pedido.canal, [...(mapa.get(pedido.canal) ?? []), pedido]);
  }

  const canais: LinhaDoCanal[] = [...mapa.entries()].map(([canal, doCanal]) => {
    const marketplace = ehMarketplace(canal);

    const validos = doCanal.filter((pedido) => pedido.status !== "CANCELADO");

    const cancelados = doCanal.filter((pedido) => pedido.status === "CANCELADO");

    const vendido = arredondar(validos.reduce((soma, pedido) => soma + pedido.total, 0));

    let entrou: number;

    let aReceber = 0;

    let pedidosAguardando = 0;

    let comissao = 0;

    let diferenca: number;

    if (marketplace) {
      const conferidos = validos.filter((pedido) => pedido.conferenciaStatus === "CONFERIDO");

      const aguardando = validos.filter((pedido) => pedido.conferenciaStatus !== "CONFERIDO");

      entrou = arredondar(conferidos.reduce((soma, pedido) => soma + (pedido.valorRecebido ?? 0), 0));

      aReceber = arredondar(aguardando.reduce((soma, pedido) => soma + (pedido.liquidoEsperado ?? 0), 0));

      pedidosAguardando = aguardando.length;

      comissao = arredondar(validos.reduce((soma, pedido) => soma + (pedido.comissaoEsperada ?? 0), 0));

      diferenca = arredondar(
        conferidos.reduce((soma, pedido) => soma + ((pedido.valorRecebido ?? 0) - (pedido.liquidoEsperado ?? 0)), 0)
      );
    } else {
      entrou = arredondar(validos.reduce((soma, pedido) => soma + pedido.pagamentoAprovado, 0));

      diferenca = arredondar(entrou - vendido);
    }

    let situacao: SituacaoDoCanal;

    if (marketplace) {
      situacao = pedidosAguardando > 0 ? "AGUARDANDO" : Math.abs(diferenca) < 0.01 ? "CONFERIDO" : "DIFERENCA";
    } else {
      situacao = Math.abs(diferenca) < 0.01 ? "BATE" : "DIFERENCA";
    }

    return {
      canal,
      tipo: marketplace ? "MARKETPLACE" : "PROPRIO",
      pedidos: validos.length,
      cancelados: cancelados.length,
      valorCancelado: arredondar(cancelados.reduce((soma, pedido) => soma + pedido.total, 0)),
      vendido,
      entrou,
      aReceber,
      pedidosAguardando,
      comissao,
      diferenca,
      situacao,
    };
  });

  // Canais próprios primeiro, depois os marketplaces; dentro de cada grupo, o que mais vendeu.
  canais.sort((a, b) =>
    a.tipo === b.tipo ? b.vendido - a.vendido : a.tipo === "PROPRIO" ? -1 : 1
  );

  const soma = (campo: keyof LinhaDoCanal) =>
    arredondar(canais.reduce((total, linha) => total + (linha[campo] as number), 0));

  const totais = {
    pedidos: canais.reduce((total, linha) => total + linha.pedidos, 0),
    cancelados: canais.reduce((total, linha) => total + linha.cancelados, 0),
    vendido: soma("vendido"),
    entrou: soma("entrou"),
    aReceber: soma("aReceber"),
    comissoes: soma("comissao"),
    diferenca: soma("diferenca"),
  };

  return {
    data,
    canais,
    totais,
    fecha:
      Math.abs(totais.vendido - (totais.entrou + totais.aReceber + totais.comissoes - totais.diferenca)) < 0.01,
  };
}
