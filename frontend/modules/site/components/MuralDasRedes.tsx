import Image from "next/image";

import { PUBLICACOES_DAS_REDES } from "../conteudo/midias";

// "Marcaram o Beatus": publicações de clientes, escolhidas à mão. Só aparece quando houver publicações.
export default function MuralDasRedes() {
  if (PUBLICACOES_DAS_REDES.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="marcaram">
      <h2 id="marcaram" className="mb-4 font-display text-2xl font-bold text-ouro">
        Marcaram o Beatus
      </h2>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PUBLICACOES_DAS_REDES.map((publicacao) => (
          <li key={publicacao.link}>
            <a href={publicacao.link} target="_blank" rel="noopener noreferrer" className="group block">
              <span className="relative block aspect-square overflow-hidden rounded-2xl bg-white/5">
                <Image src={publicacao.imagem} alt={publicacao.alt} fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover transition group-hover:scale-105" />
              </span>

              <span className="mt-2 block text-sm text-slate-300">{publicacao.autor}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
