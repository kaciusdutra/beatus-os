"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

interface Opcao {
  id: string;
  nome: string;
  descricao: string;
}

// O cliente completou o cartão: escolhe UMA vantagem (não são cumulativas). A escolha vai ao servidor, que confere o
// cartão pelo código do link.
export default function EscolherVantagem({ codigo, opcoes }: { codigo: string; opcoes: Opcao[] }) {
  const roteador = useRouter();

  const [ocupado, setOcupado] = useState("");

  const [erro, setErro] = useState("");

  async function escolher(vantagemId: string) {
    try {
      setErro("");

      setOcupado(vantagemId);

      const resposta = await fetch("/api/publico/clube/vantagem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo, vantagemId }) });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível escolher a vantagem.");
      }

      roteador.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível escolher a vantagem.");
    } finally {
      setOcupado("");
    }
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {opcoes.map((opcao) => (
          <li key={opcao.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
            <div>
              <p className="font-semibold text-white">{opcao.nome}</p>

              <p className="text-sm text-slate-400">{opcao.descricao}</p>
            </div>

            <button
              type="button"
              disabled={ocupado !== ""}
              onClick={() => void escolher(opcao.id)}
              className="cursor-pointer rounded-lg bg-ouro px-4 py-2 text-sm font-bold text-black hover:bg-ouro-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ocupado === opcao.id ? "Escolhendo..." : "Escolher"}
            </button>
          </li>
        ))}
      </ul>

      {erro && <p className="rounded-lg border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">{erro}</p>}
    </div>
  );
}
