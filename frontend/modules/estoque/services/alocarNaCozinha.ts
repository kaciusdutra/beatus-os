// Baixa por venda: de qual cartão da coluna "Na cozinha" sai cada quantidade.
// Primeiro a vencer, primeiro a sair. Função pura, sem banco.

export interface CartaoNaCozinha {
  producaoLoteId?: string;

  gavetaId?: string;

  quantidade: number;

  // Quando vence (ISO); sem validade vai por último.
  validadeAte?: string;
}

export interface Alocacao {
  producaoLoteId?: string;

  gavetaId?: string;

  quantidade: number;
}

export interface ResultadoDaAlocacao {
  alocacoes: Alocacao[];

  // O que a cozinha não tinha: a baixa sai do saldo geral, sem lote.
  faltante: number;
}

function arredondar(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}

export function alocarNaCozinha(
  cartoes: CartaoNaCozinha[],
  quantidade: number
): ResultadoDaAlocacao {
  const ordenados = [...cartoes]
    .filter((cartao) => cartao.quantidade > 0)
    .sort((a, b) =>
      (a.validadeAte ?? "9999-12-31").localeCompare(
        b.validadeAte ?? "9999-12-31"
      )
    );

  const alocacoes: Alocacao[] = [];

  let restante = quantidade;

  for (const cartao of ordenados) {
    if (restante <= 0.00005) {
      break;
    }

    const tirado = Math.min(cartao.quantidade, restante);

    alocacoes.push({
      producaoLoteId: cartao.producaoLoteId,
      gavetaId: cartao.gavetaId,
      quantidade: arredondar(tirado),
    });

    restante = arredondar(restante - tirado);
  }

  return {
    alocacoes,
    faltante: restante > 0.00005 ? restante : 0,
  };
}
