import Link from "next/link";

export default function InteligenciaPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Módulo</p>

        <h1 className="text-3xl font-bold text-slate-800">Inteligência</h1>

        <p className="mt-2 text-slate-500">A Beatriz e as análises que ajudam a decidir.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href="/inteligencia/beatriz" className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50">
          <p className="text-lg font-bold text-slate-800">Beatriz</p>

          <p className="mt-1 text-sm text-slate-500">
            A atendente por conversa: tira dúvidas do cardápio e anota o pedido, conferido com o cardápio.
          </p>
        </Link>

        <Link href="/financeiro/analise-de-vendas" className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50">
          <p className="text-lg font-bold text-slate-800">Vendas por canal e produto</p>

          <p className="mt-1 text-sm text-slate-500">O que mais rende e o que vale promover ou divulgar.</p>
        </Link>
      </div>
    </div>
  );
}
