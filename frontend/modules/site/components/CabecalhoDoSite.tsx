"use client";

import Image from "next/image";
import Link from "next/link";

import { dinheiro, quantidadeNoCarrinho, totalDoCarrinho } from "../services/carrinho";

import { abrirPainelDoCarrinho, useCarrinho } from "./carrinhoStore";

export default function CabecalhoDoSite() {
  const itens = useCarrinho();

  const quantidade = quantidadeNoCarrinho(itens);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-marca-preto/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/cardapio" className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label="Beatus Burger Delivery, início">
          <Image src="/marca/beatus-simbolo.svg" alt="" width={34} height={30} unoptimized priority />

          <span className="font-display text-xl font-extrabold tracking-wide text-ouro">BEATUS</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-semibold text-slate-200 sm:gap-4">
          <Link href="/cardapio" className="hidden rounded-lg px-3 py-2 hover:text-ouro sm:block">
            Cardápio
          </Link>

          <Link href="/cardapio/sobre" className="rounded-lg px-3 py-2 hover:text-ouro">
            Sobre
          </Link>

          <button
            type="button"
            onClick={abrirPainelDoCarrinho}
            className="ml-1 flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-ouro px-3 py-2 font-bold text-black hover:bg-ouro-400"
            aria-label={`Abrir o carrinho, ${quantidade} item(ns)`}
          >
            <span aria-hidden="true">🛒</span>

            <span>
              {quantidade > 0 ? quantidade : <span className="hidden sm:inline">Carrinho</span>}
              {quantidade > 0 && <span className="hidden sm:inline"> · {dinheiro(totalDoCarrinho(itens))}</span>}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
