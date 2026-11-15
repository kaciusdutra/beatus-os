"use client";

import { useState } from "react";

import type { RascunhoDePedido } from "../types/beatriz";

// O pedido confirmado vira um link de pagamento (checkout do site, origem WhatsApp). Quando o
// WhatsApp estiver ligado, a Beatriz manda o link sozinha; por enquanto a equipe copia e envia.
export default function LinkDePagamento({ rascunho }: { rascunho: RascunhoDePedido }) {
  const [telefone, setTelefone] = useState("");

  const [link, setLink] = useState("");

  const [erro, setErro] = useState("");

  const [copiado, setCopiado] = useState(false);

  async function gerar() {
    try {
      setErro("");
      setCopiado(false);

      const resposta = await fetch("/api/beatriz/link-de-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone,
          itens: rascunho.itens.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade, observacao: item.observacao, adicionais: item.adicionais })),
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível gerar o link.");
      }

      setLink(dados.link);
    } catch (error) {
      setLink("");
      setErro(error instanceof Error ? error.message : "Não foi possível gerar o link.");
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);

      setCopiado(true);
    } catch {
      // o campo abaixo permite selecionar e copiar à mão
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Link de pagamento (WhatsApp)</p>

      <p className="text-xs text-sky-900">
        O cliente abre o link, confere os itens, informa CPF e endereço e paga (Pix, crédito ou débito). Pago, o pedido entra sozinho na cozinha como pedido do WhatsApp.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="WhatsApp do cliente (opcional)"
          value={telefone}
          onChange={(evento) => setTelefone(evento.target.value)}
          placeholder="WhatsApp do cliente (opcional)"
          className="min-w-0 flex-1 rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
        />

        <button type="button" onClick={() => void gerar()} className="cursor-pointer rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800">
          Gerar link
        </button>
      </div>

      {erro && <p className="text-xs font-semibold text-red-700">{erro}</p>}

      {link && (
        <div className="space-y-1">
          <input readOnly value={link} onFocus={(evento) => evento.target.select()} aria-label="Link de pagamento" className="w-full rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs text-slate-700" />

          <button type="button" onClick={() => void copiar()} className="cursor-pointer text-xs font-bold text-sky-800 underline">
            {copiado ? "Copiado!" : "Copiar o link"}
          </button>
        </div>
      )}
    </div>
  );
}
