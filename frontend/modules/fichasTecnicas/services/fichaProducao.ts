// Cálculos da "Ficha de produção" (bloco 8E): o que o funcionário lê na
// cozinha. Nada aqui usa preço ou custo.
//
// Sem dependências de servidor: roda na tela e nos testes.

// Quebra o texto em passos, um por linha. Tira a numeração que a pessoa
// tenha digitado ("1.", "2)", "-", "•"), porque a tela numera sozinha.
export function passosDoTexto(texto?: string): string[] {
  if (!texto) {
    return [];
  }

  return texto
    .split(/\r?\n/)
    .map((linha) =>
      linha
        .trim()
        .replace(/^(\d+\s*[.)-]|[-•*])\s*/, "")
        .trim()
    )
    .filter(Boolean);
}

// Quanto multiplicar a receita: o que vai ser feito dividido pelo rendimento
// da receita base (para produto, o rendimento base é 1 unidade).
export function fatorDeEscala(
  quanto: number,
  rendimentoBase: number
): number {
  if (!(quanto > 0) || !(rendimentoBase > 0)) {
    return 1;
  }

  return quanto / rendimentoBase;
}

export function escalarQuantidade(
  quantidade: number,
  fator: number
): number {
  return quantidade * fator;
}

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

// "1.500 g (1,5 kg)", "2,5 un". Acima de 1.000, mostra também kg ou L.
export function formatarQuantidadeProducao(
  quantidade: number,
  unidade: string
): string {
  const texto = `${numero(quantidade)} ${unidade}`.trim();

  const minuscula = unidade.trim().toLowerCase();

  if (minuscula === "g" && quantidade >= 1000) {
    return `${texto} (${numero(quantidade / 1000)} kg)`;
  }

  if (minuscula === "ml" && quantidade >= 1000) {
    return `${texto} (${numero(quantidade / 1000)} L)`;
  }

  return texto;
}
