import Image from "next/image";

import type { LinhaDaSemana } from "../services/funcionamento";

import { PERFIL_NAS_REDES } from "../conteudo/midias";

export default function RodapeDoSite({ semana }: { semana: LinhaDaSemana[] }) {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/marca/beatus-simbolo.svg" alt="" width={34} height={30} unoptimized />

            <div>
              <p className="font-display text-xl font-extrabold tracking-wide text-ouro">BEATUS</p>

              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-300">Burger Delivery</p>
            </div>
          </div>

          {PERFIL_NAS_REDES && (
            <p className="mt-4 text-sm text-slate-300">
              Siga no {PERFIL_NAS_REDES.rede}:{" "}
              <a href={PERFIL_NAS_REDES.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-ouro underline">
                {PERFIL_NAS_REDES.usuario}
              </a>
            </p>
          )}
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ouro">Horário de funcionamento</h2>

          <ul className="mt-3 space-y-1 text-sm text-slate-300">
            {semana.map((linha) => (
              <li key={linha.dia} className="flex justify-between gap-4">
                <span>{linha.dia}</span>

                <span className={linha.texto === "Fechado" ? "text-slate-500" : "text-slate-100"}>{linha.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="border-t border-white/10 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} Beatus Burger Delivery</p>
    </footer>
  );
}
