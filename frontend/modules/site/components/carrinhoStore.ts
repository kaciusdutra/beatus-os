"use client";

import { useSyncExternalStore } from "react";

import { adicionar, alterarQuantidade, lerCarrinhoGuardado, type ItemDoCarrinho } from "../services/carrinho";

// O carrinho vive no navegador do cliente (localStorage) e é compartilhado entre
// as páginas do site. Sem armazenamento (navegação privada), vale só até recarregar.

const CHAVE = "beatus.site.carrinho";

const VAZIO: ItemDoCarrinho[] = [];

let cache: ItemDoCarrinho[] | null = null;

let painelAberto = false;

const ouvintes = new Set<() => void>();

function avisar(): void {
  ouvintes.forEach((ouvinte) => ouvinte());
}

function ler(): ItemDoCarrinho[] {
  if (cache) {
    return cache;
  }

  try {
    const bruto = localStorage.getItem(CHAVE);

    cache = bruto ? lerCarrinhoGuardado(JSON.parse(bruto)) : [];
  } catch {
    cache = [];
  }

  return cache;
}

function gravar(itens: ItemDoCarrinho[]): void {
  cache = itens;

  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    // sem armazenamento: continua na memória
  }

  avisar();
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);

  // Outra aba mudou o carrinho: relê.
  const aoMudarEmOutraAba = (evento: StorageEvent) => {
    if (evento.key === CHAVE) {
      cache = null;

      avisar();
    }
  };

  window.addEventListener("storage", aoMudarEmOutraAba);

  return () => {
    ouvintes.delete(ouvinte);

    window.removeEventListener("storage", aoMudarEmOutraAba);
  };
}

export function useCarrinho(): ItemDoCarrinho[] {
  return useSyncExternalStore(assinar, ler, () => VAZIO);
}

export function adicionarAoCarrinho(produto: { id: string; nome: string; preco: number }): void {
  gravar(adicionar(ler(), produto));
}

export function mudarQuantidade(id: string, quantidade: number): void {
  gravar(alterarQuantidade(ler(), id, quantidade));
}

export function limparCarrinho(): void {
  gravar([]);
}

// ---------- Painel do carrinho (aberto ou fechado) ----------

export function usePainelDoCarrinhoAberto(): boolean {
  return useSyncExternalStore(
    assinar,
    () => painelAberto,
    () => false
  );
}

export function abrirPainelDoCarrinho(): void {
  painelAberto = true;

  avisar();
}

export function fecharPainelDoCarrinho(): void {
  painelAberto = false;

  avisar();
}
