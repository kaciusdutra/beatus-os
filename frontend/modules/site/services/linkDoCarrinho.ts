// O link que a Beatriz manda para o cliente pagar: abre o checkout do site já com os itens
// do pedido (e a origem, para o pedido sair identificado como do WhatsApp). O link só
// carrega o que o cliente escolheu: o preço, a entrega e o total o servidor refaz.

export type OrigemDoLink = "CARDAPIO_ONLINE" | "WHATSAPP";

export interface ItemDoLink {
  produtoId: string;
  quantidade: number;
  observacao?: string;
}

export interface ConteudoDoLink {
  origem: OrigemDoLink;
  // Telefone da conversa (só dígitos), para já vir preenchido.
  telefone?: string;
  itens: ItemDoLink[];
}

export const MAXIMO_DE_ITENS_NO_LINK = 30;

const TAMANHO_MAXIMO_DO_CODIGO = 6000;

// Base64 seguro para endereço (sem + / =), que funciona no navegador e no servidor.
function codificar(texto: string): string {
  const bytes = new TextEncoder().encode(texto);

  let binario = "";

  for (const byte of bytes) {
    binario += String.fromCharCode(byte);
  }

  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodificar(codigo: string): string {
  const padrao = codigo.replace(/-/g, "+").replace(/_/g, "/");

  const binario = atob(padrao + "=".repeat((4 - (padrao.length % 4)) % 4));

  return new TextDecoder().decode(Uint8Array.from(binario, (letra) => letra.charCodeAt(0)));
}

export function montarLinkDoCarrinho(base: string, conteudo: ConteudoDoLink): string {
  const dados = {
    o: conteudo.origem === "WHATSAPP" ? "W" : "S",
    ...(conteudo.telefone ? { t: conteudo.telefone.replace(/\D/g, "").slice(0, 13) } : {}),
    i: conteudo.itens.slice(0, MAXIMO_DE_ITENS_NO_LINK).map((item) => ({ p: item.produtoId, q: item.quantidade, ...(item.observacao ? { n: item.observacao.slice(0, 140) } : {}) })),
  };

  return `${base.replace(/\/+$/, "")}/cardapio/finalizar?c=${codificar(JSON.stringify(dados))}`;
}

// Lê o código do link. Qualquer coisa fora do formato (link inventado, estragado ou
// adulterado) vira nulo: o checkout abre vazio e o cliente escolhe de novo.
export function lerLinkDoCarrinho(codigo: string | undefined | null): ConteudoDoLink | null {
  if (!codigo || codigo.length > TAMANHO_MAXIMO_DO_CODIGO || !/^[A-Za-z0-9_-]+$/.test(codigo)) {
    return null;
  }

  let dados: unknown;

  try {
    dados = JSON.parse(decodificar(codigo));
  } catch {
    return null;
  }

  if (dados === null || typeof dados !== "object") {
    return null;
  }

  const bruto = dados as Record<string, unknown>;

  if (!Array.isArray(bruto.i) || bruto.i.length === 0 || bruto.i.length > MAXIMO_DE_ITENS_NO_LINK) {
    return null;
  }

  const itens: ItemDoLink[] = [];

  for (const candidato of bruto.i as unknown[]) {
    const item = (candidato ?? {}) as Record<string, unknown>;

    const produtoId = item.p;

    const quantidade = item.q;

    if (
      typeof produtoId !== "string" ||
      !/^[A-Za-z0-9-]{8,64}$/.test(produtoId) ||
      typeof quantidade !== "number" ||
      !Number.isInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > 20 ||
      itens.some((existente) => existente.produtoId === produtoId)
    ) {
      return null;
    }

    const observacao = typeof item.n === "string" ? item.n.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 140) : "";

    itens.push({ produtoId, quantidade, ...(observacao ? { observacao } : {}) });
  }

  const telefone = typeof bruto.t === "string" ? bruto.t.replace(/\D/g, "") : "";

  return {
    origem: bruto.o === "W" ? "WHATSAPP" : "CARDAPIO_ONLINE",
    ...(telefone.length >= 10 && telefone.length <= 13 ? { telefone } : {}),
    itens,
  };
}
