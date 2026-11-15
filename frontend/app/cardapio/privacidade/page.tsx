import { POLITICA_DE_PRIVACIDADE } from "@/modules/site/conteudo/privacidade";

import { VERSAO_DA_POLITICA } from "@/modules/checkout/services/entradaDoCheckout";

export const metadata = {
  title: "Política de privacidade",
};

export default function PrivacidadePage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Privacidade</p>

        <h1 className="mt-1 font-display text-4xl font-extrabold text-ouro">Política de privacidade</h1>

        <p className="mt-2 text-sm text-slate-400">Versão {VERSAO_DA_POLITICA}</p>
      </header>

      {POLITICA_DE_PRIVACIDADE.map((secao) => (
        <section key={secao.titulo} className="space-y-2">
          <h2 className="font-display text-xl font-bold text-ouro">{secao.titulo}</h2>

          {secao.paragrafos.map((paragrafo) => (
            <p key={paragrafo} className="text-slate-300">
              {paragrafo}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
