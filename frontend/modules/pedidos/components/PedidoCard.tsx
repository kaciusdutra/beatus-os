"use client";

import {
  Pedido,
  StatusOperacional,
} from "../types/pedido";

import PedidoStatusBadge from "./PedidoStatusBadge";

interface Props {
  pedido: Pedido;
  onAvancar: (
    status: StatusOperacional
  ) => void;
}

export default function PedidoCard({
  pedido,
  onAvancar,
}: Props) {
  const proximoStatus: Partial<
    Record<
      StatusOperacional,
      {
        label: string;
        status: StatusOperacional;
      }
    >
  > = {
    NOVO: {
      label: "Iniciar preparo",
      status: "EM_PREPARO",
    },

    EM_PREPARO: {
      label: "Marcar pronto",
      status: "PRONTO",
    },

    PRONTO: {
      label: "Enviar para rota",
      status: "EM_ROTA",
    },

    EM_ROTA: {
      label: "Concluir entrega",
      status: "ENTREGUE",
    },
  };

  const acao =
    proximoStatus[
      pedido.statusOperacional
    ];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Pedido
          </p>

          <h3 className="mt-1 text-xl font-bold text-slate-900">
            #{pedido.numero}
          </h3>
        </div>

        <PedidoStatusBadge
          status={
            pedido.statusOperacional
          }
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">
            Cliente
          </span>

          <span className="font-semibold text-slate-700">
            {pedido.cliente.nome}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-500">
            Origem
          </span>

          <span className="font-semibold text-slate-700">
            {pedido.canal}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-500">
            Pagamento
          </span>

          <span className="font-semibold text-green-600">
            {pedido.pagamento.status}
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Itens
        </p>

        <div className="mt-2 space-y-1">
          {pedido.itens.map(
            (item, index) => (
              <div
                key={`${item.produtoId}-${index}`}
                className="flex justify-between gap-3 text-sm"
              >
                <span className="text-slate-600">
                  {item.quantidade}x{" "}
                  {item.nome}
                </span>

                <span className="font-semibold text-slate-700">
                  R${" "}
                  {item.subtotal.toFixed(
                    2
                  )}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-slate-200 pt-4">
        <div>
          <p className="text-xs text-slate-400">
            Total
          </p>

          <p className="text-xl font-bold text-orange-600">
            R${" "}
            {pedido.total.toFixed(2)}
          </p>
        </div>

        {acao && (
          <button
            type="button"
            onClick={() =>
              onAvancar(
                acao.status
              )
            }
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {acao.label}
          </button>
        )}
      </div>
    </article>
  );
}