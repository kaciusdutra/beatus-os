import Link from "next/link";

import { destinoDoConvite, mensagemDoConviteNoWhatsApp, origemDoConviteValida } from "@/modules/clube/convite";

import { CLUBE_ATIVO, DIAS_DE_VALIDADE_DA_VANTAGEM, DIAS_PARA_O_CARTAO_REINICIAR, SELOS_PARA_A_VANTAGEM, VALOR_MINIMO_DO_SELO, valorPremium } from "@/modules/clube/regras";

import { linkDoWhatsappDaCasa } from "@/modules/site/conteudo/contato";

export const metadata = {
  title: "Peça direto do Beatus",
  description: "Peça direto do Beatus Burger Delivery pelo site ou pelo WhatsApp.",
};

// A página que o QR da embalagem abre. Os números do clube vêm de modules/clube/regras.ts; enquanto o clube não
// estiver ligado (CLUBE_ATIVO), a página só convida a pedir direto e não promete nenhuma vantagem.
export default async function ConvitePage({ searchParams }: { searchParams: Promise<{ utm_campaign?: string }> }) {
  const { utm_campaign: campanha } = await searchParams;

  const origem = origemDoConviteValida(campanha);

  // O WhatsApp já sabe de onde o cliente veio (iFood, 99Food, Keeta ou canais próprios).
  const whatsapp = linkDoWhatsappDaCasa(mensagemDoConviteNoWhatsApp(origem));

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 px-4 py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Beatus Burger Delivery</p>

        <h1 className="mt-1 font-display text-4xl font-extrabold text-ouro">{CLUBE_ATIVO ? "Peça direto e entre para o clube" : "Peça direto do Beatus"}</h1>

        <p className="mt-3 text-lg text-slate-300">
          {CLUBE_ATIVO
            ? "Feito para poucos, e agora com vantagens para quem pede com a gente."
            : "Hambúrguer artesanal, feito para poucos, entregue na sua porta. Peça direto pelo nosso site ou pelo WhatsApp."}
        </p>
      </header>

      <div className="space-y-3">
        <Link href={`/cardapio?${destinoDoConvite(origem).split("?")[1]}`} className="block w-full rounded-xl bg-ouro px-4 py-4 text-center text-lg font-bold text-black hover:bg-ouro-400">
          Ver o cardápio e pedir pelo site
        </Link>

        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="block w-full rounded-xl border border-emerald-400/60 px-4 py-4 text-center text-lg font-bold text-emerald-300 hover:bg-emerald-950/40">
          Pedir pelo WhatsApp
        </a>
      </div>

      {CLUBE_ATIVO ? (
        <section aria-labelledby="clube" className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 id="clube" className="font-display text-xl font-bold text-ouro">
            Como funciona o clube
          </h2>

          <ol className="list-decimal space-y-2 pl-5 text-slate-300">
            <li>Faça o seu pedido e aceite participar do clube.</li>
            <li>
              A cada pedido entregue com <strong>{valorPremium(VALOR_MINIMO_DO_SELO)}</strong> ou mais em itens (sem contar a entrega), você ganha 1 selo no seu cartão digital.
            </li>
            <li>
              Com <strong>{SELOS_PARA_A_VANTAGEM} selos</strong>, você ganha uma vantagem, como um hambúrguer por conta da casa.
            </li>
          </ol>

          <p className="text-sm text-slate-400">
            O cartão fica aqui no site (e, quando você quiser, na carteira do seu celular). Ele reinicia depois de {DIAS_PARA_O_CARTAO_REINICIAR} dias sem pedidos, e a vantagem ganha vale {DIAS_DE_VALIDADE_DA_VANTAGEM} dias. Sem papel e sem
            carimbo.
          </p>
        </section>
      ) : (
        <p className="text-center text-sm text-slate-400">Em breve: o clube de vantagens do Beatus, com cartão de selos digital.</p>
      )}

      <p className="text-center text-xs text-slate-500">
        Ao pedir você aceita a nossa{" "}
        <Link href="/cardapio/privacidade" className="underline hover:text-slate-300">
          política de privacidade
        </Link>
        .
      </p>
    </div>
  );
}
