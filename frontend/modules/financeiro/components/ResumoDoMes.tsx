"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import type { FluxoDeCaixa } from "../types/fluxoDeCaixa";

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function texto(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const dia = String(data.getDate()).padStart(2, "0");

  return `${data.getFullYear()}-${mes}-${dia}`;
}

// Números reais do mês corrente, tirados do fluxo de caixa.
export default function ResumoDoMes() {
  const [fluxo, setFluxo] = useState<FluxoDeCaixa | null>(null);

  const [erro, setErro] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const agora = new Date();

        const de = texto(new Date(agora.getFullYear(), agora.getMonth(), 1));

        const ate = texto(new Date(agora.getFullYear(), agora.getMonth() + 1, 0));

        const resposta = await fetch(`/api/financeiro/fluxo?de=${de}&ate=${ate}`, {
          cache: "no-store",
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
          throw new Error(dados.mensagem || "Não foi possível carregar o mês.");
        }

        setFluxo(dados.fluxo);
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar o mês.");
      }
    })();
  }, []);

  if (erro) {
    return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>;
  }

  const cartoes = [
    { titulo: "Entradas do mês", valor: fluxo ? moeda(fluxo.entradas) : "..." },
    { titulo: "Saídas do mês", valor: fluxo ? moeda(fluxo.saidas) : "..." },
    { titulo: "Saldo do mês", valor: fluxo ? moeda(fluxo.saldo) : "..." },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cartoes.map((cartao) => (
          <div key={cartao.titulo} className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{cartao.titulo}</p>

            <p className="mt-2 text-3xl font-bold">{cartao.valor}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Dos pagamentos aprovados dos pedidos e das compras confirmadas.{" "}
        <Link href="/financeiro/fluxo-de-caixa" className="font-semibold underline">
          Ver o fluxo de caixa
        </Link>
      </p>
    </div>
  );
}
