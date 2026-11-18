import Link from "next/link";

import { notFound } from "next/navigation";

import { DIAS_DE_VALIDADE_DA_VANTAGEM, VALOR_MINIMO_DO_SELO, valorPremium } from "@/modules/clube/regras";

import { cartaoPorCodigo } from "@/modules/clube/services/server/clubeService";

import { linkDoWhatsappDaCasa } from "@/modules/site/conteudo/contato";

// O cartão é de quem tem o link: não vai para os buscadores.
export const metadata = {
  title: "Seu cartão do clube",
  robots: { index: false, follow: false },
};

function dia(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Manaus", day: "2-digit", month: "2-digit" });
}

// O cartão de selos do cliente (seção 28), aberto pelo link seguro. Mostra só o primeiro nome e os selos.
export default async function CartaoDoClubePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;

  const cartao = await cartaoPorCodigo(codigo);

  if (!cartao) {
    notFound();
  }

  const { estado } = cartao;

  const casas = Array.from({ length: estado.selosParaCompletar }, (_, indice) => indice < estado.selos);

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 px-4 py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Clube do Beatus</p>

        <h1 className="mt-1 font-display text-4xl font-extrabold text-ouro">Olá, {cartao.primeiroNome}</h1>

        <p className="mt-3 text-lg text-slate-300">
          {estado.completo ? "Seu cartão está completo!" : estado.venceu ? "Seu cartão recomeçou: o próximo pedido vale o primeiro selo." : `Faltam ${estado.faltam} ${estado.faltam === 1 ? "pedido" : "pedidos"} para a sua vantagem.`}
        </p>
      </header>

      <section aria-label="Seus selos" className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <ul className="grid grid-cols-4 gap-3">
          {casas.map((cheia, indice) => (
            <li
              key={indice}
              aria-label={cheia ? `Selo ${indice + 1}: ganho` : `Selo ${indice + 1}: falta`}
              className={`flex aspect-square items-center justify-center rounded-full border-2 text-2xl font-extrabold ${cheia ? "border-ouro bg-ouro text-black" : "border-white/20 text-white/20"}`}
            >
              {cheia ? "✓" : indice + 1}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-center text-sm text-slate-300">
          {estado.selos} de {estado.selosParaCompletar} selos
        </p>
      </section>

      {estado.completo && estado.vantagemValeAte && (
        <section className="space-y-3 rounded-2xl border border-ouro/40 bg-ouro/10 p-6">
          <h2 className="font-display text-xl font-bold text-ouro">Sua vantagem</h2>

          <p className="text-slate-200">
            Você completou o cartão e ganhou uma vantagem do clube. Ela vale até <strong>{dia(estado.vantagemValeAte)}</strong> ({DIAS_DE_VALIDADE_DA_VANTAGEM} dias). Fale com a gente para resgatar.
          </p>

          <a href={linkDoWhatsappDaCasa("Oi! Completei o meu cartão do clube e quero resgatar a minha vantagem.")} target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-ouro px-4 py-3 text-center font-bold text-black hover:bg-ouro-400">
            Resgatar pelo WhatsApp
          </a>
        </section>
      )}

      <section className="space-y-2 text-sm text-slate-400">
        <p>
          Cada pedido entregue com <strong className="text-slate-200">{valorPremium(VALOR_MINIMO_DO_SELO)}</strong> ou mais em itens (sem contar a entrega) dá 1 selo.
        </p>

        {estado.reiniciaEm && !estado.completo && <p>Se você ficar sem pedir, o cartão reinicia em {dia(estado.reiniciaEm)}.</p>}
      </section>

      <div className="text-center">
        <Link href="/cardapio" className="inline-block rounded-xl bg-ouro px-6 py-3 font-bold text-black hover:bg-ouro-400">
          Ver o cardápio e pedir
        </Link>
      </div>

      <p className="text-center text-xs text-slate-500">
        Guarde este endereço: é o seu cartão. Só você deve ter o link.{" "}
        <Link href="/cardapio/privacidade" className="underline hover:text-slate-300">
          Política de privacidade
        </Link>
        .
      </p>
    </div>
  );
}
