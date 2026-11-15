import Image from "next/image";

import { FOTOS_DO_SITE } from "../conteudo/midias";

// Só aparece quando houver fotos em conteudo/midias.ts.
export default function GaleriaDeFotos() {
  if (FOTOS_DO_SITE.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="fotos">
      <h2 id="fotos" className="mb-4 font-display text-2xl font-bold text-ouro">
        Fotos
      </h2>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FOTOS_DO_SITE.map((foto) => (
          <li key={foto.src} className="relative aspect-square overflow-hidden rounded-2xl bg-white/5">
            <Image src={foto.src} alt={foto.alt} fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" />
          </li>
        ))}
      </ul>
    </section>
  );
}
