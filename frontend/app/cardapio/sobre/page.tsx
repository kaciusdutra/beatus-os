import Link from "next/link";

import GaleriaDeFotos from "@/modules/site/components/GaleriaDeFotos";

import MuralDasRedes from "@/modules/site/components/MuralDasRedes";

import { INSTITUCIONAL } from "@/modules/site/conteudo/institucional";

export const metadata = {
  title: "Sobre o Beatus",
  description: "A história, a missão e os valores do Beatus Burger Delivery.",
};

export default function SobrePage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-12 px-4 py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sobre</p>

        <h1 className="mt-1 font-display text-4xl font-extrabold text-ouro">{INSTITUCIONAL.nome}</h1>

        <p className="mt-3 text-lg text-slate-300">{INSTITUCIONAL.chamada}</p>
      </header>

      <section aria-labelledby="historia">
        <h2 id="historia" className="mb-3 font-display text-2xl font-bold text-ouro">
          Nossa história
        </h2>

        <div className="space-y-3 text-slate-300">
          {INSTITUCIONAL.historia.map((paragrafo) => (
            <p key={paragrafo}>{paragrafo}</p>
          ))}
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="missao" className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 id="missao" className="mb-2 font-display text-xl font-bold text-ouro">
            Missão
          </h2>

          <p className="text-slate-300">{INSTITUCIONAL.missao}</p>
        </section>

        <section aria-labelledby="objetivo" className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 id="objetivo" className="mb-2 font-display text-xl font-bold text-ouro">
            Objetivo
          </h2>

          <p className="text-slate-300">{INSTITUCIONAL.objetivo}</p>
        </section>
      </div>

      <section aria-labelledby="valores">
        <h2 id="valores" className="mb-4 font-display text-2xl font-bold text-ouro">
          Valores
        </h2>

        <ul className="grid gap-4 sm:grid-cols-2">
          {INSTITUCIONAL.valores.map((valor) => (
            <li key={valor.titulo} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-semibold text-white">{valor.titulo}</h3>

              <p className="mt-1 text-sm text-slate-400">{valor.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <GaleriaDeFotos />

      <MuralDasRedes />

      <Link href="/cardapio" className="inline-block rounded-xl bg-ouro px-6 py-3 font-bold text-black hover:bg-ouro-400">
        Ver o cardápio
      </Link>
    </div>
  );
}
