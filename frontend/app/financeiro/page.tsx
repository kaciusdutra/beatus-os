"use client";

import { verificarAcesso } from "@/core/permissions/accessControl";

export default function FinanceiroPage() {
  const acesso = verificarAcesso(
    "financeiro.visualizar"
  );

  if (!acesso.permitido) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">
            🔒
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-800">
            Acesso restrito
          </h1>

          <p className="mt-2 text-slate-500">
            Seu perfil não possui permissão para
            acessar o módulo Financeiro.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Módulo
        </p>

        <h1 className="text-3xl font-bold text-slate-800">
          Financeiro
        </h1>

        <p className="mt-2 text-slate-500">
          Estrutura inicial do módulo financeiro
          do Beatus OS.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Faturamento
          </p>

          <p className="mt-2 text-3xl font-bold">
            R$ 1.864,50
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Entradas
          </p>

          <p className="mt-2 text-3xl font-bold">
            R$ 0,00
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Saídas
          </p>

          <p className="mt-2 text-3xl font-bold">
            R$ 0,00
          </p>
        </div>
      </div>
    </div>
  );
}