"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import type { ClienteDetalhe, ClienteListado } from "../types/consultaCliente";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function data(iso: string | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

export default function ClientesPage() {
  const [busca, setBusca] = useState("");

  const [clientes, setClientes] = useState<ClienteListado[]>([]);

  const [erro, setErro] = useState("");

  const [mensagem, setMensagem] = useState("");

  const [carregando, setCarregando] = useState(true);

  const [aberto, setAberto] = useState<string | null>(null);

  const [detalhe, setDetalhe] = useState<ClienteDetalhe | null>(null);

  const [edicao, setEdicao] = useState({ nome: "", email: "", dataNascimento: "" });

  const carregar = useCallback(async () => {
    const resposta = await fetch(`/api/clientes/lista?busca=${encodeURIComponent(busca)}`, {
      cache: "no-store",
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível listar os clientes.");
    }

    setClientes(dados.clientes ?? []);
  }, [busca]);

  useEffect(() => {
    // Espera o fim da digitação antes de consultar.
    const espera = setTimeout(() => {
      void (async () => {
        try {
          await carregar();

          setErro("");
        } catch (error) {
          setErro(error instanceof Error ? error.message : "Não foi possível listar os clientes.");
        } finally {
          setCarregando(false);
        }
      })();
    }, 300);

    return () => clearTimeout(espera);
  }, [carregar]);

  function preencherEdicao(cliente: ClienteDetalhe) {
    setEdicao({
      nome: cliente.nome,
      email: cliente.email ?? "",
      dataNascimento: cliente.dataNascimento ?? "",
    });
  }

  async function abrir(cliente: ClienteListado) {
    setMensagem("");

    if (aberto === cliente.id) {
      setAberto(null);

      return;
    }

    setAberto(cliente.id);
    setDetalhe(null);

    try {
      const resposta = await fetch(`/api/clientes/${cliente.id}`, { cache: "no-store" });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível ler o cliente.");
      }

      setDetalhe(dados.cliente);
      preencherEdicao(dados.cliente);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível ler o cliente.");
    }
  }

  async function salvar(corpo: object) {
    if (!detalhe) {
      return;
    }

    try {
      setErro("");
      setMensagem("");

      const resposta = await fetch(`/api/clientes/${detalhe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível salvar o cliente.");
      }

      setDetalhe(dados.cliente);
      preencherEdicao(dados.cliente);
      setMensagem("Cliente salvo.");

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o cliente.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Relacionamento</p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clientes</h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Cadastro e histórico dos clientes. Quantidade de pedidos, total e ticket médio vêm dos pedidos reais, sem
          os cancelados. Clientes novos entram pelo PDV, na hora do pedido.
        </p>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      <div className="max-w-md">
        <label htmlFor="busca-cliente" className="mb-1 block text-xs font-semibold text-slate-600">Buscar por nome, telefone, CPF ou e-mail</label>

        <input id="busca-cliente" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar..." className={CLASSE_CAMPO} />
      </div>

      {carregando && <p className="p-6 text-center text-sm text-slate-500">Carregando clientes...</p>}

      {!carregando && clientes.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Nenhum cliente encontrado.</p>
      )}

      {clientes.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm shadow-sm">
          {clientes.map((cliente) => (
            <li key={cliente.id}>
              <button
                type="button"
                onClick={() => void abrir(cliente)}
                className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {cliente.nome}
                    {!cliente.ativo && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">inativo</span>}
                  </p>

                  <p className="text-xs text-slate-500">
                    {cliente.telefone}
                    {cliente.origemPrimeiroPedido ? ` · veio por ${cliente.origemPrimeiroPedido}` : ""}
                  </p>
                </div>

                <div className="text-right text-xs text-slate-500">
                  <p>
                    <strong className="text-slate-900">{cliente.quantidadePedidos}</strong> pedido(s) · ticket médio{" "}
                    <strong className="text-slate-900">{moeda(cliente.ticketMedio)}</strong>
                  </p>

                  <p>último pedido: {data(cliente.ultimoPedidoEm)}</p>
                </div>
              </button>

              {aberto === cliente.id && (
                <div className="space-y-4 border-t border-slate-100 bg-slate-50 px-5 py-4">
                  {!detalhe && <p className="text-xs text-slate-500">Carregando o cliente...</p>}

                  {detalhe && detalhe.id === cliente.id && (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Dados</h3>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <label htmlFor="ed-nome" className="mb-1 block text-xs font-semibold text-slate-600">Nome</label>

                              <input id="ed-nome" value={edicao.nome} onChange={(evento) => setEdicao({ ...edicao, nome: evento.target.value })} className={CLASSE_CAMPO} />
                            </div>

                            <div>
                              <label htmlFor="ed-email" className="mb-1 block text-xs font-semibold text-slate-600">E-mail</label>

                              <input id="ed-email" value={edicao.email} onChange={(evento) => setEdicao({ ...edicao, email: evento.target.value })} className={CLASSE_CAMPO} />
                            </div>

                            <div>
                              <label htmlFor="ed-nascimento" className="mb-1 block text-xs font-semibold text-slate-600">Nascimento</label>

                              <input id="ed-nascimento" type="date" value={edicao.dataNascimento} onChange={(evento) => setEdicao({ ...edicao, dataNascimento: evento.target.value })} className={CLASSE_CAMPO} />
                            </div>
                          </div>

                          <p className="text-xs text-slate-500">Telefone {detalhe.telefone} · CPF {detalhe.cpf} (não mudam por aqui)</p>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => void salvar({ nome: edicao.nome, email: edicao.email || null, dataNascimento: edicao.dataNascimento || null })}
                              className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              Salvar
                            </button>

                            <button
                              type="button"
                              onClick={() => void salvar({ ativo: !detalhe.ativo })}
                              className="cursor-pointer text-xs font-semibold text-slate-700 underline"
                            >
                              {detalhe.ativo ? "Inativar cliente" : "Reativar cliente"}
                            </button>

                            {mensagem && <span className="text-xs font-semibold text-emerald-700">{mensagem}</span>}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Endereços</h3>

                            {detalhe.enderecos.length === 0 ? (
                              <p className="text-xs text-slate-400">Nenhum endereço.</p>
                            ) : (
                              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                                {detalhe.enderecos.map((endereco) => (
                                  <li key={endereco.id}>
                                    <strong>{endereco.rotulo}</strong>
                                    {endereco.principal ? " (principal)" : ""}: {endereco.texto}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Últimos pedidos · total {moeda(detalhe.valorTotal)}
                            </h3>

                            {detalhe.pedidosRecentes.length === 0 ? (
                              <p className="text-xs text-slate-400">Ainda não pediu.</p>
                            ) : (
                              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                                {detalhe.pedidosRecentes.map((pedido) => (
                                  <li key={pedido.id}>
                                    <Link href="/pedidos" className="font-semibold underline">#{pedido.numero}</Link> ·{" "}
                                    {data(pedido.criadoEm)} · {pedido.canal} · {pedido.status.toLowerCase().replace("_", " ")} ·{" "}
                                    {moeda(pedido.total)}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
