"use client";

import Image from "next/image";

import { dinheiro } from "../services/carrinho";

import type { CategoriaDoCardapio } from "../services/montarCardapio";

import { adicionarAoCarrinho, useCarrinho } from "./carrinhoStore";

function NaCesta({ id }: { id: string }) {
  const quantidade = useCarrinho().find((item) => item.id === id)?.quantidade ?? 0;

  return quantidade > 0 ? <span className="text-xs font-semibold text-ouro">{quantidade} no carrinho</span> : null;
}

export default function CardapioDoSite({ categorias }: { categorias: CategoriaDoCardapio[] }) {
  if (categorias.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
        O cardápio está sendo atualizado. Volte em instantes.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <nav aria-label="Categorias" className="sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto bg-marca-preto/95 px-4 py-3 backdrop-blur">
        {categorias.map((categoria) => (
          <a key={categoria.chave} href={`#${categoria.chave}`} className="whitespace-nowrap rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-ouro hover:text-ouro">
            {categoria.titulo}
          </a>
        ))}
      </nav>

      {categorias.map((categoria) => (
        <section key={categoria.chave} id={categoria.chave} className="scroll-mt-32">
          <h2 className="mb-4 font-display text-2xl font-bold text-ouro">{categoria.titulo}</h2>

          <ul className="grid gap-4 sm:grid-cols-2">
            {categoria.itens.map((item) => (
              <li key={item.id} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                {/* A foto do produto entra numa etapa seguinte; até lá, a marca. */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-marca-preto ring-1 ring-white/10">
                  <Image src="/marca/beatus-simbolo.svg" alt="" width={40} height={36} unoptimized />
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="font-semibold text-white">{item.nome}</h3>

                  {item.descricao && <p className="mt-1 line-clamp-3 text-sm text-slate-400">{item.descricao}</p>}

                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <div>
                      <p className="font-bold text-ouro">{dinheiro(item.preco)}</p>

                      <NaCesta id={item.id} />
                    </div>

                    <button
                      type="button"
                      onClick={() => adicionarAoCarrinho({ id: item.id, nome: item.nome, preco: item.preco })}
                      className="cursor-pointer rounded-xl bg-ouro px-4 py-2 text-sm font-bold text-black hover:bg-ouro-400"
                      aria-label={`Adicionar ${item.nome} ao carrinho`}
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
