// O cartão cuja vantagem o cliente quer usar no próximo pedido fica guardado no navegador dele (o código do link
// do cartão). O checkout manda o código ao servidor, que confere tudo no banco: o que está guardado nunca é confiado.

export const CHAVE_DA_VANTAGEM = "beatus.site.vantagem";

export interface ArmazenamentoDaVantagem {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
}

const FORMATO_DO_CODIGO = /^[A-Za-z0-9_-]{43}$/;

export function codigoDeCartaoValido(codigo: unknown): codigo is string {
  return typeof codigo === "string" && FORMATO_DO_CODIGO.test(codigo);
}

export function guardarCodigoDaVantagem(armazenamento: ArmazenamentoDaVantagem, codigo: string): boolean {
  if (!codigoDeCartaoValido(codigo)) {
    return false;
  }

  try {
    armazenamento.setItem(CHAVE_DA_VANTAGEM, codigo);

    return true;
  } catch {
    return false;
  }
}

export function lerCodigoDaVantagem(armazenamento: Pick<ArmazenamentoDaVantagem, "getItem">): string | undefined {
  try {
    const guardado = armazenamento.getItem(CHAVE_DA_VANTAGEM);

    return codigoDeCartaoValido(guardado) ? guardado : undefined;
  } catch {
    return undefined;
  }
}

export function limparVantagemGuardada(armazenamento: Pick<ArmazenamentoDaVantagem, "removeItem">): void {
  try {
    armazenamento.removeItem(CHAVE_DA_VANTAGEM);
  } catch {
    // sem armazenamento: nada a limpar
  }
}
