import Image from "next/image";

// A marca no alto das telas de entrada.
export default function MarcaDaEntrada({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-3 rounded-2xl bg-marca-preto px-6 py-4">
        <Image src="/marca/beatus-simbolo.svg" alt="" width={44} height={40} unoptimized priority />

        <div className="text-left">
          <div className="font-display text-2xl font-extrabold leading-none tracking-wide text-ouro">BEATUS</div>

          <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-slate-300">Burger Delivery</div>
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-bold text-slate-900">{titulo}</h1>

      {subtitulo && <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitulo}</p>}
    </div>
  );
}
