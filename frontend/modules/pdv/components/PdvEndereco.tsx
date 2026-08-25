"use client";

import {
  useState,
} from "react";

import {
  AddressSearchResult,
} from "@/core/address/addressTypes";

import {
  buscarPorCep,
  buscarPorEndereco,
} from "@/core/address/addressService";

interface Props {
  onEnderecoSelecionado: (
    endereco: AddressSearchResult
  ) => void;
}

export default function PdvEndereco({
  onEnderecoSelecionado,
}: Props) {
  const [cep, setCep] =
    useState("");

  const [busca, setBusca] =
    useState("");

  const [resultados, setResultados] =
    useState<AddressSearchResult[]>(
      []
    );

  const [modoBusca, setModoBusca] =
    useState<"CEP" | "ENDERECO">(
      "CEP"
    );

  const [mensagem, setMensagem] =
    useState<string | null>(
      null
    );

  function pesquisarCep() {
    setMensagem(null);

    const encontrados =
      buscarPorCep(cep);

    setResultados(encontrados);

    if (encontrados.length === 0) {
      setMensagem(
        "CEP não localizado. Você pode procurar pelo endereço."
      );
    }
  }

  function pesquisarEndereco() {
    setMensagem(null);

    const encontrados =
      buscarPorEndereco(
        busca
      );

    setResultados(encontrados);

    if (encontrados.length === 0) {
      setMensagem(
        "Nenhum endereço encontrado."
      );
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Localizar endereço
        </h3>

        <p className="mt-1 text-xs text-slate-400">
          Informe o CEP ou procure pela rua, bairro ou cidade.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            setModoBusca("CEP")
          }
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
            modoBusca === "CEP"
              ? "bg-orange-500 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Buscar por CEP
        </button>

        <button
          type="button"
          onClick={() =>
            setModoBusca(
              "ENDERECO"
            )
          }
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
            modoBusca === "ENDERECO"
              ? "bg-orange-500 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Não sei o CEP
        </button>
      </div>

      {modoBusca === "CEP" ? (
        <div className="flex gap-2">
          <input
            value={cep}
            onChange={(event) =>
              setCep(
                event.target.value
              )
            }
            placeholder="CEP"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
          />

          <button
            type="button"
            onClick={
              pesquisarCep
            }
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
          >
            Buscar
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={busca}
            onChange={(event) =>
              setBusca(
                event.target.value
              )
            }
            placeholder="Rua, bairro ou cidade"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
          />

          <button
            type="button"
            onClick={
              pesquisarEndereco
            }
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
          >
            Buscar
          </button>
        </div>
      )}

      {mensagem && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {mensagem}
        </div>
      )}

      {resultados.length > 0 && (
        <div className="space-y-2">
          {resultados.map(
            (resultado) => (
              <button
                key={resultado.id}
                type="button"
                onClick={() =>
                  onEnderecoSelecionado(
                    resultado
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-orange-400 hover:bg-orange-50"
              >
                <p className="font-semibold text-slate-800">
                  {resultado.logradouro}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {resultado.bairro} —{" "}
                  {resultado.cidade}/
                  {resultado.estado}
                </p>

                {resultado.cep && (
                  <p className="mt-1 text-xs text-slate-400">
                    CEP{" "}
                    {resultado.cep}
                  </p>
                )}

                {resultado.distanciaSimuladaKm !==
                  undefined && (
                  <p className="mt-2 text-xs font-semibold text-orange-600">
                    Distância de teste:{" "}
                    {resultado.distanciaSimuladaKm.toFixed(
                      2
                    )}{" "}
                    km
                  </p>
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}