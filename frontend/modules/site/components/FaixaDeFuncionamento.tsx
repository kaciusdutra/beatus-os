import type { Funcionamento } from "../services/funcionamento";

export default function FaixaDeFuncionamento({ funcionamento }: { funcionamento: Funcionamento }) {
  const aberto = funcionamento.situacao === "ABERTO";

  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
        aberto ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/15 bg-white/5 text-slate-300"
      }`}
    >
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${aberto ? "bg-emerald-400" : "bg-slate-500"}`} />

      {funcionamento.texto}
    </p>
  );
}
