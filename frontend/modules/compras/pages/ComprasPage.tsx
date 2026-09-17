"use client";

import { useEffect, useMemo, useState } from "react";

import { EntradaCompra } from "../types/entradaCompra";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor: string): string {
  if (!valor) {
    return "—";
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "—";
  }

  return data.toLocaleDateString("pt-BR");
}

function obterNomeFornecedor(
  fornecedorId: string
): string {
  return fornecedorId || "Fornecedor não informado";
}

function obterRotuloStatus(
  status: EntradaCompra["status"]
): string {
  switch (status) {
    case "RASCUNHO":
      return "Rascunho";
    case "CONFIRMADA":
      return "Confirmada";
    case "CANCELADA":
      return "Cancelada";
    default:
      return status;
  }
}

function obterClasseStatus(
  status: EntradaCompra["status"]
): string {
  switch (status) {
    case "RASCUNHO":
      return "bg-amber-100 text-amber-700";
    case "CONFIRMADA":
      return "bg-emerald-100 text-emerald-700";
    case "CANCELADA":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function obterTipoDocumento(
  tipo: EntradaCompra["tipoDocumento"]
): string {
  switch (tipo) {
    case "NOTA_FISCAL":
      return "Nota fiscal";
    case "RECIBO":
      return "Recibo";
    case "COMPROVANTE":
      return "Comprovante";
    case "OUTRO":
      return "Outro";
    default:
      return tipo;
  }
}

export default function ComprasPage() {
  const [entradas, setEntradas] =
    useState<EntradaCompra[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [busca, setBusca] =
    useState("");

  const carregarEntradas = async () => {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await fetch(
        "/api/compras/entradas",
        {
          cache: "no-store",
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados?.mensagem ??
            "Não foi possível carregar as entradas de compra."
        );
      }

      setEntradas(
        dados?.entradas ?? []
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar as entradas de compra."
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregarEntradas();
  }, []);

  const entradasFiltradas =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLocaleLowerCase("pt-BR");

      if (!termo) {
        return entradas;
      }

      return entradas.filter(
        (entrada) => {
          const fornecedor =
            obterNomeFornecedor(
              entrada.fornecedorId
            ).toLocaleLowerCase(
              "pt-BR"
            );

          const documento =
            (
              entrada.numeroDocumento ??
              ""
            ).toLocaleLowerCase(
              "pt-BR"
            );

          const chave =
            (
              entrada.chaveAcesso ??
              ""
            ).toLocaleLowerCase(
              "pt-BR"
            );

          return (
            fornecedor.includes(termo) ||
            documento.includes(termo) ||
            chave.includes(termo)
          );
        }
      );
    }, [busca, entradas]);

  const totalEntradas =
    entradas.length;

  const totalRascunhos =
    entradas.filter(
      (entrada) =>
        entrada.status === "RASCUNHO"
    ).length;

  const totalConfirmadas =
    entradas.filter(
      (entrada) =>
        entrada.status === "CONFIRMADA"
    ).length;

  const valorTotal =
    entradas.reduce(
      (total, entrada) =>
        total + Number(entrada.valorTotal ?? 0),
      0
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Suprimentos
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Compras
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Controle as entradas de compras,
            documentos e valores recebidos pelo
            Beatus.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              "/compras/entradas/nova";
          }}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          + Nova entrada
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total de entradas
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {totalEntradas}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Rascunhos
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-600">
            {totalRascunhos}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Confirmadas
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {totalConfirmadas}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Valor das entradas
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatarMoeda(valorTotal)}
          </p>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Entradas de compra
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Histórico das compras registradas.
            </p>
          </div>

          <input
            type="text"
            value={busca}
            onChange={(evento) =>
              setBusca(evento.target.value)
            }
            placeholder="Buscar fornecedor, documento ou chave..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 lg:w-96"
          />
        </div>

        {carregando ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Carregando entradas de compra...
          </div>
        ) : entradasFiltradas.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-base font-semibold text-slate-800">
              Nenhuma entrada encontrada
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {entradas.length === 0
                ? "Cadastre a primeira entrada de compra para começar."
                : "Ajuste a busca para encontrar a entrada desejada."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Entrada
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Fornecedor
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Documento
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Data
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total
                  </th>

                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {entradasFiltradas.map(
                  (entrada) => (
                    <tr
                      key={entrada.id}
                      onClick={() => {
                        window.location.href =
                          `/compras/entradas/${entrada.id}`;
                      }}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {entrada.numeroDocumento
                            ? `Documento ${entrada.numeroDocumento}`
                            : `Entrada ${entrada.id.slice(
                                0,
                                8
                              )}`}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {entrada.itens.length}{" "}
                          {entrada.itens.length ===
                          1
                            ? "item"
                            : "itens"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {obterNomeFornecedor(
                          entrada.fornecedorId
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-slate-800">
                          {obterTipoDocumento(
                            entrada.tipoDocumento
                          )}
                        </div>

                        {entrada.chaveAcesso && (
                          <div className="mt-1 max-w-xs truncate text-xs text-slate-400">
                            {entrada.chaveAcesso}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatarData(
                          entrada.dataEntrada
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                        {formatarMoeda(
                          entrada.valorTotal
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obterClasseStatus(
                            entrada.status
                          )}`}
                        >
                          {obterRotuloStatus(
                            entrada.status
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}