"use client";

import { useState } from "react";

import type { CanalPedido } from "@/modules/pedidos/types/pedido";

import type { ItemComanda } from "../types/pdv";

interface Props {
  itens: ItemComanda[];

  origem: CanalPedido;

  onOrigemChange: (origem: CanalPedido) => void;

  onAlterarQuantidade: (produtoId: string, quantidade: number) => void;

  onRemover: (produtoId: string) => void;

  // Devolve true quando o pedido foi lançado (a comanda limpa os campos).
  onLancar: (dados: { codigo: string; nomeCliente: string }) => Promise<boolean>;
}

const ROTULO: Record<string, string> = {
  IFOOD: "iFood",
  "99FOOD": "99Food",
  KEETA: "Keeta",
};

// Comanda do pedido que veio de um marketplace: sem cliente, endereço nem
// cobrança. A plataforma entrega e já aprovou o pagamento; basta o código do
// pedido para conferir o repasse depois.
export default function PdvComandaMarketplace({
  itens,
  origem,
  onOrigemChange,
  onAlterarQuantidade,
  onRemover,
  onLancar,
}: Props) {
  const [codigo, setCodigo] = useState("");

  const [nomeCliente, setNomeCliente] = useState("");

  const total = itens.reduce((soma, item) => soma + item.subtotal, 0);

  const podeLancar = itens.length > 0 && codigo.trim() !== "";

  async function lancar() {
    const ok = await onLancar({ codigo: codigo.trim(), nomeCliente: nomeCliente.trim() });

    if (ok) {
      setCodigo("");
      setNomeCliente("");
    }
  }

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Pedido de marketplace</h2>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        A plataforma entrega e já aprovou o pagamento. Não precisa de cliente nem de endereço. O preço é o do canal.
      </p>

      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Canal
        <select
          value={origem}
          onChange={(evento) => onOrigemChange(evento.target.value as CanalPedido)}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
        >
          <option value="PDV">PDV (voltar ao balcão)</option>

          <option value="WHATSAPP">WhatsApp</option>

          <option value="CARDAPIO_ONLINE">Cardápio Online</option>

          <option value="IFOOD">iFood</option>

          <option value="99FOOD">99Food</option>

          <option value="KEETA">Keeta</option>
        </select>
      </label>

      <div className="mt-4 grid gap-3">
        <label className="block text-sm font-semibold text-slate-700">
          Código do pedido no {ROTULO[origem] ?? "marketplace"} *
          <input
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            placeholder="Ex.: 7421"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Nome do cliente (opcional, só para consulta)
          <input
            value={nomeCliente}
            onChange={(evento) => setNomeCliente(evento.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
          />
        </label>
      </div>

      <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Itens ({itens.length})</h3>

        {itens.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Nenhum produto adicionado.
          </div>
        )}

        {itens.map((item) => (
          <div key={item.produtoId} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{item.nome}</p>

                <p className="mt-1 text-sm text-slate-500">R$ {item.precoUnitario.toFixed(2)}</p>
              </div>

              <button type="button" onClick={() => onRemover(item.produtoId)} className="shrink-0 text-xs font-semibold text-red-500">
                Remover
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onAlterarQuantidade(item.produtoId, item.quantidade - 1)} className="h-9 w-9 rounded-lg bg-slate-100 font-bold hover:bg-slate-200">
                  −
                </button>

                <span className="w-6 text-center font-semibold">{item.quantidade}</span>

                <button type="button" onClick={() => onAlterarQuantidade(item.produtoId, item.quantidade + 1)} className="h-9 w-9 rounded-lg bg-slate-100 font-bold hover:bg-slate-200">
                  +
                </button>
              </div>

              <strong className="shrink-0 text-orange-600">R$ {item.subtotal.toFixed(2)}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between text-lg font-bold text-slate-900">
          <span>Total do pedido</span>

          <span>R$ {total.toFixed(2)}</span>
        </div>

        <button
          type="button"
          disabled={!podeLancar}
          onClick={() => void lancar()}
          className="mt-3 w-full cursor-pointer rounded-xl bg-orange-600 px-4 py-4 font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Lançar pedido do {ROTULO[origem] ?? "marketplace"}
        </button>

        {!podeLancar && (
          <p className="mt-2 text-xs text-slate-500">Adicione os itens e informe o código do pedido.</p>
        )}
      </div>
    </aside>
  );
}
