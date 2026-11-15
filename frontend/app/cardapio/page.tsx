import Image from "next/image";
import Link from "next/link";

import CardapioDoSite from "@/modules/site/components/CardapioDoSite";

import FaixaDeFuncionamento from "@/modules/site/components/FaixaDeFuncionamento";

import GaleriaDeFotos from "@/modules/site/components/GaleriaDeFotos";

import MuralDasRedes from "@/modules/site/components/MuralDasRedes";

import { INSTITUCIONAL } from "@/modules/site/conteudo/institucional";

import { cardapioDaPagina } from "@/modules/site/services/server/cardapioDaPagina";

export const metadata = {
  title: "Cardápio",
};

export default async function CardapioPage() {
  const { categorias, funcionamento } = await cardapioDaPagina();

  return (
    <>
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top,#2a2012,transparent_60%)]">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 py-14 text-center">
          <Image src="/marca/beatus-simbolo.svg" alt="" width={88} height={79} unoptimized priority />

          <h1 className="font-display text-5xl font-extrabold tracking-wide text-ouro sm:text-6xl">BEATUS</h1>

          <p className="-mt-2 text-xs uppercase tracking-[0.35em] text-slate-300">Burger Delivery</p>

          <p className="max-w-md text-lg text-slate-200">{INSTITUCIONAL.chamada}</p>

          <FaixaDeFuncionamento funcionamento={funcionamento} />

          <a href="#cardapio" className="rounded-xl bg-ouro px-6 py-3 font-bold text-black hover:bg-ouro-400">
            Ver o cardápio
          </a>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl space-y-16 px-4 pt-8">
        <div id="cardapio" className="scroll-mt-20">
          <CardapioDoSite categorias={categorias} />
        </div>

        <GaleriaDeFotos />

        <MuralDasRedes />

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-slate-300">{INSTITUCIONAL.missao}</p>

          <Link href="/cardapio/sobre" className="mt-3 inline-block font-semibold text-ouro underline">
            Conheça o Beatus
          </Link>
        </section>
      </div>
    </>
  );
}
