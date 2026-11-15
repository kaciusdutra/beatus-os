// O carrinho do site, guardado no navegador do cliente. O preço aqui é só para
// mostrar: no checkout o servidor refaz todas as contas com o preço do canal
// (regra 3.8), então um preço adulterado no navegador não vale nada.

export interface ItemDoCarrinho {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

export const MAXIMO_POR_ITEM = 20;

export const MAXIMO_DE_ITENS = 30;

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function adicionar(itens: ItemDoCarrinho[], produto: { id: string; nome: string; preco: number }): ItemDoCarrinho[] {
  const existente = itens.find((item) => item.id === produto.id);

  if (existente) {
    return itens.map((item) => (item.id === produto.id ? { ...item, quantidade: Math.min(item.quantidade + 1, MAXIMO_POR_ITEM) } : item));
  }

  if (itens.length >= MAXIMO_DE_ITENS) {
    return itens;
  }

  return [...itens, { id: produto.id, nome: produto.nome, preco: produto.preco, quantidade: 1 }];
}

// Quantidade zero ou menos tira o item.
export function alterarQuantidade(itens: ItemDoCarrinho[], id: string, quantidade: number): ItemDoCarrinho[] {
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return itens.filter((item) => item.id !== id);
  }

  return itens.map((item) => (item.id === id ? { ...item, quantidade: Math.min(Math.floor(quantidade), MAXIMO_POR_ITEM) } : item));
}

export function totalDoCarrinho(itens: ItemDoCarrinho[]): number {
  return arredondar(itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0));
}

export function quantidadeNoCarrinho(itens: ItemDoCarrinho[]): number {
  return itens.reduce((soma, item) => soma + item.quantidade, 0);
}

// O que vem do armazenamento do navegador não é de confiança (pode estar estragado
// ou ter sido mexido): só entra o que tem a forma certa.
export function lerCarrinhoGuardado(bruto: unknown): ItemDoCarrinho[] {
  if (!Array.isArray(bruto)) {
    return [];
  }

  const itens: ItemDoCarrinho[] = [];

  for (const candidato of bruto) {
    if (itens.length >= MAXIMO_DE_ITENS || candidato === null || typeof candidato !== "object") {
      continue;
    }

    const { id, nome, preco, quantidade } = candidato as Record<string, unknown>;

    if (
      typeof id === "string" &&
      id.length > 0 &&
      id.length <= 80 &&
      typeof nome === "string" &&
      nome.length > 0 &&
      nome.length <= 120 &&
      typeof preco === "number" &&
      Number.isFinite(preco) &&
      preco > 0 &&
      typeof quantidade === "number" &&
      Number.isInteger(quantidade) &&
      quantidade >= 1 &&
      !itens.some((item) => item.id === id)
    ) {
      itens.push({ id, nome, preco: arredondar(preco), quantidade: Math.min(quantidade, MAXIMO_POR_ITEM) });
    }
  }

  return itens;
}

export function dinheiro(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
