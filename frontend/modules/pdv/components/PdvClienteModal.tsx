"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AddressSearchResult,
} from "@/core/address/addressTypes";


import PdvEndereco from "./PdvEndereco";

import {
  Cliente,
  RotuloEndereco,
} from "@/modules/clientes/types/cliente";

interface Props {
  aberto: boolean;

  telefone: string;

  onFechar: () => void;

  onSalvar: (dados: {
    nome: string;
    cpf: string;
    email: string;
    dataNascimento: string;
    enderecoSelecionado: AddressSearchResult;
    numero: string;
    complemento: string;
    rotuloEndereco: RotuloEndereco;
  }) => void;

  onClienteEncontradoPorCpf: (
  cliente: Cliente
) => void;
}

export default function PdvClienteModal({
  aberto,
  telefone,
  onFechar,
  onSalvar,
  onClienteEncontradoPorCpf,
}: Props) {
  const [nome, setNome] =
    useState("");

  const [cpf, setCpf] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [
    dataNascimento,
    setDataNascimento,
  ] = useState("");

  const [
    enderecoSelecionado,
    setEnderecoSelecionado,
  ] = useState<AddressSearchResult | null>(
    null
  );

  const [numero, setNumero] =
    useState("");

  const [
    complemento,
    setComplemento,
  ] = useState("");

  const [
    rotuloEndereco,
    setRotuloEndereco,
  ] =
    useState<RotuloEndereco>(
      "CASA"
    );

  const [erro, setErro] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    if (!aberto) {
      return;
    }

    setNome("");
    setCpf("");
    setEmail("");
    setDataNascimento("");
    setEnderecoSelecionado(
      null
    );
    setNumero("");
    setComplemento("");
    setRotuloEndereco("CASA");
    setErro(null);
  }, [aberto]);

  if (!aberto) {
    return null;
  }

  async function salvar() {
  setErro(null);

  if (!nome.trim()) {
    setErro(
      "Informe o nome do cliente."
    );

    return;
  }

  const cpfNormalizado =
    cpf.replace(/\D/g, "");

  if (!cpfNormalizado) {
    setErro(
      "Informe o CPF do cliente."
    );

    return;
  }

  if (cpfNormalizado.length !== 11) {
    setErro(
      "Informe um CPF válido."
    );

    return;
  }

  if (!enderecoSelecionado) {
    setErro(
      "Localize e selecione o endereço principal."
    );

    return;
  }

  if (!numero.trim()) {
    setErro(
      "Informe o número do endereço."
    );

    return;
  }

  try {
    const resposta =
      await fetch(
        `/api/clientes?cpf=${encodeURIComponent(
          cpfNormalizado
        )}`,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",
          },
        }
      );

    const resultado =
      await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado?.mensagem ??
          "Não foi possível consultar o CPF."
      );
    }

    if (resultado.encontrado) {
      const cliente =
        resultado.cliente as Cliente;

      onClienteEncontradoPorCpf(
        cliente
      );

      return;
    }

    onSalvar({
      nome: nome.trim(),

      cpf: cpfNormalizado,

      email: email.trim(),

      dataNascimento,

      enderecoSelecionado,

      numero: numero.trim(),

      complemento:
        complemento.trim(),

      rotuloEndereco,
    });
  } catch (error) {
    setErro(
      error instanceof Error
        ? error.message
        : "Não foi possível consultar o CPF."
    );
  }
}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                Novo cliente
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Cadastro do cliente
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                O telefone será vinculado ao cadastro.
              </p>
            </div>

            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <section>
              <label className="text-sm font-semibold text-slate-700">
                Telefone
              </label>

              <input
                value={telefone}
                readOnly
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-600"
              />
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                Dados do cliente
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Nome *
                  </label>

                  <input
                    autoFocus
                    value={nome}
                    onChange={(event) =>
                      setNome(
                        event.target.value
                      )
                    }
                    placeholder="Nome completo"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    CPF *
                  </label>

                  <input
                    value={cpf}
                    onChange={(event) =>
                      setCpf(
                        event.target.value
                      )
                    }
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="000.000.000-00"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Data de nascimento
                  </label>

                  <input
                    type="date"
                    value={
                      dataNascimento
                    }
                    onChange={(event) =>
                      setDataNascimento(
                        event.target.value
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    E-mail
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="cliente@email.com"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 pt-6">
              {!enderecoSelecionado ? (
                <PdvEndereco
                  onEnderecoSelecionado={
                    setEnderecoSelecionado
                  }
                />
              ) : (
                <div>
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                          Primeiro endereço
                        </p>

                        <p className="mt-2 font-semibold text-slate-800">
                          {
                            enderecoSelecionado.logradouro
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {
                            enderecoSelecionado.bairro
                          }{" "}
                          —{" "}
                          {
                            enderecoSelecionado.cidade
                          }
                          /
                          {
                            enderecoSelecionado.estado
                          }
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEnderecoSelecionado(
                            null
                          );

                          setNumero("");

                          setComplemento("");
                        }}
                        className="text-xs font-semibold text-red-500"
                      >
                        Alterar
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        Rótulo *
                      </label>

                      <select
                        value={
                          rotuloEndereco
                        }
                        onChange={(event) =>
                          setRotuloEndereco(
                            event.target
                              .value as RotuloEndereco
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
                      >
                        <option value="CASA">
                          Casa
                        </option>

                        <option value="TRABALHO">
                          Trabalho
                        </option>

                        <option value="FAMILIA">
                          Família
                        </option>

                        <option value="OUTRO">
                          Outro
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        Número *
                      </label>

                      <input
                        value={numero}
                        onChange={(event) =>
                          setNumero(
                            event.target.value
                          )
                        }
                        placeholder="Número"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-semibold text-slate-700">
                      Complemento
                    </label>

                    <input
                      value={complemento}
                      onChange={(event) =>
                        setComplemento(
                          event.target.value
                        )
                      }
                      placeholder="Apartamento, casa, referência..."
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}
            </section>

            {erro && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {erro}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white p-6">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-600"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={salvar}
              className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600"
            >
              Salvar cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}