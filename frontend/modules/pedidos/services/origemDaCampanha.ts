// De qual campanha de anúncio o pedido veio (os quatro campos padrão de link de anúncio:
// origem, meio, campanha e criativo). Texto vindo da internet: aqui ele é limpo e limitado,
// e o que sobra é só letras minúsculas, números, hífen, sublinhado e ponto.

export interface OrigemDaCampanha {
  fonte?: string;
  meio?: string;
  nome?: string;
  conteudo?: string;
}

const TAMANHO_MAXIMO = 60;

function limparValor(valor: unknown): string | undefined {
  if (typeof valor !== "string") {
    return undefined;
  }

  const limpo = valor
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, TAMANHO_MAXIMO);

  return limpo || undefined;
}

// Aceita o objeto já no formato do sistema; devolve nada se não sobrou campo algum.
export function limparOrigemDaCampanha(bruto: unknown): OrigemDaCampanha | undefined {
  if (!bruto || typeof bruto !== "object") {
    return undefined;
  }

  const entrada = bruto as Record<string, unknown>;

  const origem: OrigemDaCampanha = {};

  const fonte = limparValor(entrada.fonte);

  const meio = limparValor(entrada.meio);

  const nome = limparValor(entrada.nome);

  const conteudo = limparValor(entrada.conteudo);

  if (fonte) {
    origem.fonte = fonte;
  }

  if (meio) {
    origem.meio = meio;
  }

  if (nome) {
    origem.nome = nome;
  }

  if (conteudo) {
    origem.conteudo = conteudo;
  }

  return Object.keys(origem).length > 0 ? origem : undefined;
}

// Lê os parâmetros utm_* do endereço da página.
export function origemDaCampanhaDoEndereco(parametros: URLSearchParams): OrigemDaCampanha | undefined {
  return limparOrigemDaCampanha({
    fonte: parametros.get("utm_source"),
    meio: parametros.get("utm_medium"),
    nome: parametros.get("utm_campaign"),
    conteudo: parametros.get("utm_content"),
  });
}

export function resumoDaCampanha(origem: OrigemDaCampanha | undefined): string {
  return [origem?.fonte, origem?.meio, origem?.nome, origem?.conteudo].filter(Boolean).join(" / ");
}
