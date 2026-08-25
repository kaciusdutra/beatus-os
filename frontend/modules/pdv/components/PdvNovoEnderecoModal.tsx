"use client";

import {
  useEffect,
  useState,
} from "react";

import PdvEndereco from "./PdvEndereco";

import {
  AddressSearchResult,
} from "@/core/address/addressTypes";

import {
  calcularEntrega,
} from "@/core/delivery/deliveryService";

import {
  RotuloEndereco,
} from "@/modules/clientes/types/cliente";

interface Props {
  aberto: boolean;

  onFechar: () => void;

  onUsarEndereco: (dados: {
    endereco: AddressSearchResult;
    numero: string;
    complemento: string;
    rotulo: RotuloEndereco;
    salvarNoCadastro: boolean;
  }) => void;
}

export default function PdvNovoEnderecoModal({
  aberto,
  onFechar,
  onUsarEndereco,
}: Props) {
  const [
    enderecoSelecionado,
    setEnderecoSelecionado,
  ] =
    useState<AddressSearchResult | null>(
      null
    );

  const [numero, setNumero] =
    useState("");

  const [
    complemento,
    setComplemento,
  ] = useState("");

  const [rotulo, setRotulo] =
    useState<RotuloEndereco>(
      "OUTRO"
    );

  const [
    salvarNoCadastro,
    setSalvarNoCadastro,
  ] = useState(false);

  const [erro, setErro] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    if (!aberto) {
      return;
    }

    setEnderecoSelecionado(null);
    setNumero("");
    setComplemento("");
    setRotulo("OUTRO");
    setSalvarNoCadastro(false);
    setErro(null);
  }, [aberto]);

  if (!aberto) {
    return null;
  }

  const distanciaEntregaKm =
    enderecoSelecionado?.distanciaSimuladaKm ??
    null;

  const entrega =
    calcularEntrega(
      distanciaEntregaKm
    );

  const taxaEntrega =
    entrega.status ===
    "CALCULADO"
      ? entrega.taxa
      : 0;

  function usarEndereco() {
    setErro(null);

    if (!enderecoSelecionado) {
      setErro(
        "Localize o endereço antes de continuar."
      );
      return;
    }

    if (!numero.trim()) {
      setErro(
        "Informe o número do endereço."
      );
      return;
    }

    if (
      entrega.status ===
      "FORA_DA_AREA"
    ) {
      setErro(
        "Este endereço está fora da área de entrega do Beatus."
      );
      return;
    }

    if (
      entrega.status !==
      "CALCULADO"
    ) {
      setErro(
        "Não foi possível calcular a entrega para este endereço."
      );
      return;
    }

    onUsarEndereco({
      endereco:
        enderecoSelecionado,

      numero:
        numero.trim(),

      complemento:
        complemento.trim(),

      rotulo,

      salvarNoCadastro,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                Entrega
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Novo endereço
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Este endereço será usado nesta entrega e não substituirá o principal.
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
          <div className="space-y-5">
            {!enderecoSelecionado ? (
              <section>
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    Localizar endereço
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Informe o CEP ou procure pela rua, bairro ou cidade.
                  </p>
                </div>

                <PdvEndereco
                  onEnderecoSelecionado={
                    setEnderecoSelecionado
                  }
                />
              </section>
            ) : (
              <>
                <section>
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                          Endereço localizado
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

                        {enderecoSelecionado.cep && (
                          <p className="mt-1 text-xs text-slate-400">
                            CEP{" "}
                            {
                              enderecoSelecionado.cep
                            }
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setEnderecoSelecionado(
                            null
                          )
                        }
                        className="text-xs font-semibold text-red-500"
                      >
                        Alterar
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Dados da entrega
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        Número *

                        <input
                          autoFocus
                          value={numero}
                          onChange={(event) =>
                            setNumero(
                              event.target.value
                            )
                          }
                          placeholder="Número"
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        Rótulo

                        <select
                          value={rotulo}
                          onChange={(event) =>
                            setRotulo(
                              event.target
                                .value as RotuloEndereco
                            )
                          }
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
                        >
                          <option value="OUTRO">
                            Outro
                          </option>

                          <option value="TRABALHO">
                            Trabalho
                          </option>

                          <option value="FAMILIA">
                            Família
                          </option>

                          <option value="CASA">
                            Casa
                          </option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-semibold text-slate-700">
                      Complemento

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
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Cálculo da entrega
                  </h3>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>
                        Distância
                      </span>

                      <strong className="text-slate-800">
                        {distanciaEntregaKm !==
                        null
                          ? `${distanciaEntregaKm.toFixed(
                              2
                            )} km`
                          : "A calcular"}
                      </strong>
                    </div>

                    <div
                      className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                        entrega.status ===
                        "CALCULADO"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {
                        entrega.mensagem
                      }
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="text-sm text-slate-500">
                        Taxa de entrega
                      </span>

                      <strong className="text-lg text-slate-900">
                        R${" "}
                        {taxaEntrega.toFixed(
                          2
                        )}
                      </strong>
                    </div>

                    {entrega.regraAplicada && (
                      <p className="mt-2 text-xs text-slate-400">
                        {
                          entrega.regraAplicada
                        }
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <input
                      type="checkbox"
                      checked={
                        salvarNoCadastro
                      }
                      onChange={(event) =>
                        setSalvarNoCadastro(
                          event.target
                            .checked
                        )
                      }
                      className="mt-1 h-4 w-4"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        Salvar este endereço no cadastro
                      </span>

                      <span className="mt-1 block text-xs text-slate-500">
                        O endereço será adicionado ao cliente e ficará disponível em futuras compras.
                      </span>
                    </span>
                  </label>
                </section>

                {erro && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {erro}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
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
              disabled={
                !enderecoSelecionado
              }
              onClick={
                usarEndereco
              }
              className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Usar este endereço
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}