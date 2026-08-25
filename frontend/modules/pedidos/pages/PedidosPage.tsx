"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Pedido,
  StatusOperacional,
} from "../types/pedido";

import {
  getPedidoRepository,
} from "../services/pedidoRepository";

import {
  mudarStatusPedido,
} from "../domain/pedidoStatus";

import PedidoCard from "../components/PedidoCard";

const colunas: {
  status: StatusOperacional;
  titulo: string;
}[] = [
  {
    status: "NOVO",
    titulo: "Novos",
  },

  {
    status: "EM_PREPARO",
    titulo: "Em preparo",
  },

  {
    status: "PRONTO",
    titulo: "Prontos",
  },

  {
    status: "EM_ROTA",
    titulo: "Em rota",
  },

  {
    status: "ENTREGUE",
    titulo: "Entregues",
  },
];

export default function PedidosPage() {
  const [pedidos, setPedidos] =
    useState<Pedido[]>([]);

  function carregarPedidos() {
    setPedidos(
      getPedidoRepository().listar()
    );
  }

  useEffect(() => {
    carregarPedidos();

    const intervalo =
      setInterval(
        carregarPedidos,
        1000
      );

    return () =>
      clearInterval(
        intervalo
      );
  }, []);

  function avancarPedido(
    pedido: Pedido,
    novoStatus: StatusOperacional
  ) {
    try {
      const pedidoAtualizado =
        mudarStatusPedido(
          pedido,
          novoStatus
        );

      getPedidoRepository().atualizar(
        pedidoAtualizado
      );

      carregarPedidos();
    } catch (error) {
      console.error(
        "Erro ao alterar status do pedido:",
        error
      );
    }
  }

  return (
    <main className="min-h-full bg-slate-100 p-6">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
            Operação
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Pedidos
          </h1>

          <p className="mt-1 text-slate-500">
            Fila operacional de pedidos do Beatus OS.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          {colunas.map(
            (coluna) => {
              const pedidosDaColuna =
                pedidos.filter(
                  (pedido) =>
                    pedido.statusOperacional ===
                    coluna.status
                );

              return (
                <section
                  key={coluna.status}
                  className="min-h-[300px] rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800">
                      {coluna.titulo}
                    </h2>

                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 shadow-sm">
                      {
                        pedidosDaColuna.length
                      }
                    </span>
                  </div>

                  <div className="space-y-3">
                    {pedidosDaColuna.length ===
                      0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-400">
                        Nenhum pedido
                      </div>
                    )}

                    {pedidosDaColuna.map(
                      (pedido) => (
                        <PedidoCard
                          key={pedido.id}
                          pedido={pedido}
                          onAvancar={(
                            novoStatus
                          ) =>
                            avancarPedido(
                              pedido,
                              novoStatus
                            )
                          }
                        />
                      )
                    )}
                  </div>
                </section>
              );
            }
          )}
        </div>
      </div>
    </main>
  );
}