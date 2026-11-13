"use client";

import Link from "next/link";

import { verificarAcesso } from "@/core/permissions/accessControl";

import ResumoDoMes from "@/modules/financeiro/components/ResumoDoMes";

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
          Caixa, custos fixos e precificação do Beatus OS.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/financeiro/fluxo-de-caixa"
          className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50"
        >
          <p className="text-lg font-bold text-slate-800">
            Fluxo de caixa
          </p>

          <p className="mt-1 text-sm text-slate-500">
            O que entrou e o que saiu por período, com lançamentos
            avulsos de despesas e receitas.
          </p>
        </Link>

        <Link
          href="/financeiro/contas-a-pagar"
          className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50"
        >
          <p className="text-lg font-bold text-slate-800">
            Contas a pagar
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Boletos e duplicatas das compras a prazo, com vencimento e pagamento.
          </p>
        </Link>

        <Link
          href="/financeiro/capital-de-giro"
          className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50"
        >
          <p className="text-lg font-bold text-slate-800">
            Capital de giro
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Saldo, vencimentos, projeção do caixa e alertas.
          </p>
        </Link>

        <Link
          href="/financeiro/precificacao"
          className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50"
        >
          <p className="text-lg font-bold text-slate-800">
            Precificação
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Preço, CMV, markup e margem por produto e canal, com
            as margens de 20, 25, 30 e 35%.
          </p>
        </Link>

        <Link
          href="/financeiro/custos-fixos"
          className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50"
        >
          <p className="text-lg font-bold text-slate-800">
            Custos fixos
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Aluguel, energia, gás, mão de obra e outros custos do
            mês, e o custo fixo por pedido.
          </p>
        </Link>
      </div>

      <ResumoDoMes />
    </div>
  );
}