"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Cliente,
} from "../types/cliente";

import {
  getClienteRepository,
} from "../services/clienteRepository";

export default function ClientesPage() {
  const [clientes, setClientes] =
    useState<Cliente[]>([]);

  useEffect(() => {
    setClientes(
      getClienteRepository().listar()
    );
  }, []);

  return (
    <main className="min-h-full bg-slate-100 p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
            Relacionamento
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Clientes
          </h1>

          <p className="mt-1 text-slate-500">
            Cadastro e histórico dos clientes do Beatus.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {clientes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Nenhum cliente cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-3 py-3">
                      Cliente
                    </th>

                    <th className="px-3 py-3">
                      Telefone
                    </th>

                    <th className="px-3 py-3">
                      Aniversário
                    </th>

                    <th className="px-3 py-3">
                      Pedidos
                    </th>

                    <th className="px-3 py-3">
                      Ticket médio
                    </th>

                    <th className="px-3 py-3">
                      Origem
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {clientes.map(
                    (cliente) => (
                      <tr
                        key={cliente.id}
                        className="border-b border-slate-100"
                      >
                        <td className="px-3 py-4 font-semibold text-slate-800">
                          {cliente.nome}
                        </td>

                        <td className="px-3 py-4 text-slate-600">
                          {cliente.telefone}
                        </td>

                        <td className="px-3 py-4 text-slate-600">
                          {cliente.dataNascimento ??
                            "—"}
                        </td>

                        <td className="px-3 py-4 text-slate-600">
                          {cliente.quantidadePedidos}
                        </td>

                        <td className="px-3 py-4 font-semibold text-orange-600">
                          R${" "}
                          {cliente.ticketMedio.toFixed(
                            2
                          )}
                        </td>

                        <td className="px-3 py-4 text-slate-600">
                          {
                            cliente.origemPrimeiroPedido
                          }
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}