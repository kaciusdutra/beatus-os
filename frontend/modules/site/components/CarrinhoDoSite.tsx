"use client";

import Link from "next/link";

import { dinheiro, quantidadeNoCarrinho, totalDoCarrinho } from "../services/carrinho";

import { fecharPainelDoCarrinho, limparCarrinho, mudarQuantidade, useCarrinho, usePainelDoCarrinhoAberto } from "./carrinhoStore";

// O painel do carrinho. "Finalizar pedido" leva ao checkout (dados, entrega e pagamento).
export default function CarrinhoDoSite({ recebePedidos }: { recebePedidos: boolean }) {
  const aberto = usePainelDoCarrinhoAberto();

  const itens = useCarrinho();

  if (!aberto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Carrinho">
      <button type="button" aria-label="Fechar o carrinho" onClick={fecharPainelDoCarrinho} className="absolute inset-0 cursor-default bg-black/70" />

      <aside className="relative flex h-full w-full max-w-md flex-col bg-[#101010] text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-display text-xl font-bold text-ouro">Seu pedido</h2>

          <button type="button" onClick={fecharPainelDoCarrinho} className="cursor-pointer rounded-lg px-3 py-1 text-2xl text-slate-300 hover:text-white" aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {itens.length === 0 ? (
            <p className="text-slate-400">Seu carrinho está vazio. Escolha algo no cardápio.</p>
          ) : (
            <ul className="space-y-4">
              {itens.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.nome}</p>

                    <p className="text-sm text-slate-400">{dinheiro(item.preco)} cada</p>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => mudarQuantidade(item.id, item.quantidade - 1)} className="h-8 w-8 cursor-pointer rounded-lg border border-white/20 text-lg hover:border-ouro" aria-label={`Tirar um ${item.nome}`}>
                        −
                      </button>

                      <span className="w-6 text-center font-bold">{item.quantidade}</span>

                      <button type="button" onClick={() => mudarQuantidade(item.id, item.quantidade + 1)} className="h-8 w-8 cursor-pointer rounded-lg border border-white/20 text-lg hover:border-ouro" aria-label={`Mais um ${item.nome}`}>
                        +
                      </button>
                    </div>

                    <p className="mt-1 text-sm font-semibold text-ouro">{dinheiro(item.preco * item.quantidade)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {itens.length > 0 && (
          <div className="space-y-3 border-t border-white/10 px-5 py-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total ({quantidadeNoCarrinho(itens)} item(ns))</span>

              <span className="text-ouro">{dinheiro(totalDoCarrinho(itens))}</span>
            </div>

            <p className="text-xs text-slate-400">A taxa de entrega entra no fechamento do pedido, conforme o seu endereço.</p>

            {recebePedidos ? (
              <Link href="/cardapio/finalizar" onClick={fecharPainelDoCarrinho} className="block w-full rounded-xl bg-ouro px-4 py-3 text-center font-bold text-black hover:bg-ouro-400">
                Finalizar pedido
              </Link>
            ) : (
              <button type="button" disabled className="w-full cursor-not-allowed rounded-xl bg-ouro/40 px-4 py-3 font-bold text-black/70">
                Casa fechada: volte no horário de funcionamento
              </button>
            )}

            <p className="text-center text-xs text-slate-500">Seu carrinho fica guardado neste aparelho.</p>

            <button type="button" onClick={limparCarrinho} className="w-full cursor-pointer text-center text-sm text-slate-400 underline hover:text-white">
              Esvaziar o carrinho
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
