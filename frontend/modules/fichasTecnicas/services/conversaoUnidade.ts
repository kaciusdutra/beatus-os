export function converterQuantidade(
  quantidade: number,
  unidadeOrigem: string,
  unidadeDestino: string
): number {
  if (quantidade < 0) {
    throw new Error(
      "Quantidade não pode ser negativa."
    );
  }

  const origem =
    unidadeOrigem.trim().toLowerCase();

  const destino =
    unidadeDestino.trim().toLowerCase();

  if (origem === destino) {
    return quantidade;
  }

  const conversoes: Record<
    string,
    number
  > = {
    kg: 1000,
    g: 1,
    l: 1000,
    ml: 1,
  };

  const fatorOrigem =
    conversoes[origem];

  const fatorDestino =
    conversoes[destino];

  if (
    fatorOrigem === undefined ||
    fatorDestino === undefined
  ) {
    throw new Error(
      `Não é possível converter ${unidadeOrigem} para ${unidadeDestino}.`
    );
  }

  return (
    quantidade *
    (fatorOrigem / fatorDestino)
  );
}

// Converte só quando as duas unidades são da mesma família (kg/g, L/ml) ou
// iguais. Devolve undefined quando não há conversão possível (exemplo: pct
// para un), para o cálculo tentar a equivalência cadastrada no insumo.
export function converterSeCompativel(
  quantidade: number,
  unidadeOrigem: string,
  unidadeDestino: string
): number | undefined {
  try {
    return converterQuantidade(
      quantidade,
      unidadeOrigem,
      unidadeDestino
    );
  } catch (erro) {
    if (
      erro instanceof Error &&
      erro.message.startsWith(
        "Não é possível converter"
      )
    ) {
      return undefined;
    }

    throw erro;
  }
}
