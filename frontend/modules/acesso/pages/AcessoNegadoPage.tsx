import Link from "next/link";

export default function AcessoNegadoPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">🔒</div>

        <h1 className="mt-4 text-2xl font-bold text-slate-800">Acesso restrito</h1>

        <p className="mt-2 text-slate-500">Seu perfil não tem acesso a esta tela. Se precisar dela, fale com o administrador.</p>

        <Link href="/" className="mt-6 inline-block rounded-xl bg-marca-preto px-5 py-3 text-sm font-bold text-ouro">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
