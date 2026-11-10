"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  type VinculoItemCompra,
} from "@/modules/compras/types/entradaCompra";

import {
  rotuloDestinoItemCompra,
} from "@/modules/compras/domain/destinoItemCompra";

import { Fornecedor } from "@/modules/fornecedores/types/fornecedor";

import { Insumo } from "../types/insumo";

type Filtro = "PENDENTES" | "LIGADOS" | "TODOS";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor: string): string {
  const data = new Date(valor);

  return Number.isNaN(data.getTime())
    ? "—"
    : data.toLocaleDateString("pt-BR");
}

function nomeFornecedor(
  fornecedor?: Fornecedor
): string {
  return (
    fornecedor?.nomeFantasia ||
    fornecedor?.razaoSocial ||
    "Fornecedor não encontrado"
  );
}

export default function VinculosCompraPage() {
  const [vinculos, setVinculos] = useState<
    VinculoItemCompra[]
  >([]);

  const [insumos, setInsumos] = useState<
    Insumo[]
  >([]);

  const [fornecedores, setFornecedores] =
    useState<Map<string, Fornecedor>>(
      new Map()
    );

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [filtro, setFiltro] =
    useState<Filtro>("PENDENTES");

  const [busca, setBusca] = useState("");

  // Texto digitado no campo de insumo de cada linha.
  const [escolhas, setEscolhas] = useState<
    Record<string, string>
  >({});

  const [salvandoId, setSalvandoId] =
    useState<string | null>(null);

  const [erroLinha, setErroLinha] = useState<
    Record<string, string>
  >({});

  const carregarInsumos = useCallback(async () => {
    const resposta = await fetch(
      "/api/insumos",
      { cache: "no-store" }
    );

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(
        dados.mensagem ||
          "Não foi possível carregar os insumos."
      );
    }

    setInsumos(dados.insumos ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [respostaVinculos, respostaFornecedores] =
          await Promise.all([
            fetch("/api/compras/vinculos-itens", {
              cache: "no-store",
            }),
            fetch("/api/fornecedores", {
              cache: "no-store",
            }),
          ]);

        const dadosVinculos =
          await respostaVinculos.json();

        const dadosFornecedores =
          await respostaFornecedores.json();

        if (
          !respostaVinculos.ok ||
          !dadosVinculos.sucesso
        ) {
          throw new Error(
            dadosVinculos.mensagem ||
              "Não foi possível carregar os itens de compra."
          );
        }

        setVinculos(dadosVinculos.vinculos ?? []);

        setFornecedores(
          new Map(
            (
              (dadosFornecedores.fornecedores ??
                []) as Fornecedor[]
            ).map((fornecedor) => [
              fornecedor.id,
              fornecedor,
            ])
          )
        );

        await carregarInsumos();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a tela."
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregarInsumos]);

  const insumosAtivos = useMemo(
    () =>
      insumos
        .filter((insumo) => insumo.ativo)
        .sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR")
        ),
    [insumos]
  );

  const nomePorInsumo = useMemo(
    () =>
      new Map(
        insumos.map((insumo) => [
          insumo.id,
          insumo.nome,
        ])
      ),
    [insumos]
  );

  const totalPendentes = vinculos.filter(
    (vinculo) => !vinculo.insumoId
  ).length;

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return vinculos.filter((vinculo) => {
      if (
        filtro === "PENDENTES" &&
        vinculo.insumoId
      ) {
        return false;
      }

      if (
        filtro === "LIGADOS" &&
        !vinculo.insumoId
      ) {
        return false;
      }

      if (!termo) {
        return true;
      }

      return (
        vinculo.descricao
          .toLowerCase()
          .includes(termo) ||
        nomeFornecedor(
          fornecedores.get(vinculo.fornecedorId)
        )
          .toLowerCase()
          .includes(termo)
      );
    });
  }, [busca, filtro, fornecedores, vinculos]);

  async function salvar(
    vinculo: VinculoItemCompra,
    insumoId: string | null
  ) {
    setSalvandoId(vinculo.id);
    setErro("");
    setAviso("");

    setErroLinha((anterior) => ({
      ...anterior,
      [vinculo.id]: "",
    }));

    try {
      const resposta = await fetch(
        `/api/compras/vinculos-itens/${vinculo.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ insumoId }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(
          dados.mensagem ||
            "Não foi possível salvar o vínculo."
        );
      }

      const atualizado =
        dados.vinculo as VinculoItemCompra;

      setVinculos((anteriores) =>
        anteriores.map((item) =>
          item.id === atualizado.id
            ? atualizado
            : item
        )
      );

      setEscolhas((anterior) => ({
        ...anterior,
        [vinculo.id]: "",
      }));

      setAviso(
        insumoId
          ? `"${vinculo.descricao}" ligado a ${nomePorInsumo.get(insumoId) ?? "insumo"}.`
          : `"${vinculo.descricao}" voltou para a lista de itens sem insumo.`
      );
    } catch (error) {
      setErroLinha((anterior) => ({
        ...anterior,
        [vinculo.id]:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o vínculo.",
      }));
    } finally {
      setSalvandoId(null);
    }
  }

  function ligar(vinculo: VinculoItemCompra) {
    const digitado = (
      escolhas[vinculo.id] ?? ""
    )
      .trim()
      .toLowerCase();

    const insumo = insumosAtivos.find(
      (item) =>
        item.nome.trim().toLowerCase() ===
        digitado
    );

    if (!insumo) {
      setErroLinha((anterior) => ({
        ...anterior,
        [vinculo.id]:
          "Escolha um insumo da lista (digite parte do nome e selecione).",
      }));

      return;
    }

    void salvar(vinculo, insumo.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/insumos"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Insumos
          </Link>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Itens de compras
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Ligue cada item que o fornecedor vende ao
            insumo certo, uma única vez. As próximas
            compras do mesmo item já vêm ligadas. O
            custo automático pelo último preço entra
            no próximo bloco: por enquanto o vínculo
            só fica registrado.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/insumos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            + Cadastrar insumo
          </a>

          <button
            type="button"
            onClick={() =>
              void carregarInsumos().catch(
                (error) =>
                  setErro(
                    error instanceof Error
                      ? error.message
                      : "Não foi possível atualizar a lista."
                  )
              )
            }
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ↻ Atualizar insumos
          </button>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {aviso && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {aviso}
        </div>
      )}

      <datalist id="insumos-ativos">
        {insumosAtivos.map((insumo) => (
          <option
            key={insumo.id}
            value={insumo.nome}
          />
        ))}
      </datalist>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Itens de notas confirmadas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {totalPendentes} sem insumo de{" "}
              {vinculos.length}. Só aparecem itens com
              destino Insumo ou Embalagem.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl border border-slate-300 p-1">
              {(
                [
                  ["PENDENTES", "Sem insumo"],
                  ["LIGADOS", "Ligados"],
                  ["TODOS", "Todos"],
                ] as [Filtro, string][]
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setFiltro(valor)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    filtro === valor
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={busca}
              onChange={(evento) =>
                setBusca(evento.target.value)
              }
              placeholder="Buscar item ou fornecedor..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 lg:w-72"
            />
          </div>
        </div>

        {carregando ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Carregando itens de compra...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-base font-semibold text-slate-800">
              Nenhum item encontrado
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {vinculos.length === 0
                ? "Os itens aparecem aqui depois que uma entrada de compra é confirmada com destino Insumo ou Embalagem."
                : filtro === "PENDENTES"
                  ? "Todos os itens já estão ligados a um insumo."
                  : "Ajuste a busca ou o filtro."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Item do fornecedor
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Última compra
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Insumo
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtrados.map((vinculo) => {
                  const ultima =
                    vinculo.ultimaCompra;

                  const ocupado =
                    salvandoId === vinculo.id;

                  return (
                    <tr key={vinculo.id}>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-slate-900">
                          {vinculo.descricao}
                        </p>

                        <p className="text-xs text-slate-500">
                          {nomeFornecedor(
                            fornecedores.get(
                              vinculo.fornecedorId
                            )
                          )}
                          {" · "}
                          {rotuloDestinoItemCompra(
                            vinculo.destino
                          )}
                          {" · "}
                          comprado {vinculo.vezesUsada}{" "}
                          {vinculo.vezesUsada === 1
                            ? "vez"
                            : "vezes"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 align-top text-sm text-slate-700">
                        {ultima ? (
                          <>
                            <p>
                              {formatarData(
                                ultima.dataEntrada
                              )}
                              {ultima.numeroDocumento &&
                                ` · doc. ${ultima.numeroDocumento}`}
                            </p>

                            <p className="text-xs text-slate-500">
                              {ultima.quantidade.toLocaleString(
                                "pt-BR"
                              )}{" "}
                              {ultima.unidade} ×{" "}
                              {formatarMoeda(
                                ultima.valorUnitario
                              )}
                              {ultima.desconto > 0 &&
                                ` (desc. ${formatarMoeda(ultima.desconto)})`}
                            </p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-5 py-4 align-top">
                        {vinculo.insumoId ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                              {nomePorInsumo.get(
                                vinculo.insumoId
                              ) ?? "Insumo"}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                void salvar(
                                  vinculo,
                                  null
                                )
                              }
                              disabled={ocupado}
                              className="cursor-pointer text-sm font-semibold text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Desfazer
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <input
                              list="insumos-ativos"
                              value={
                                escolhas[vinculo.id] ??
                                ""
                              }
                              onChange={(evento) =>
                                setEscolhas(
                                  (anterior) => ({
                                    ...anterior,
                                    [vinculo.id]:
                                      evento.target
                                        .value,
                                  })
                                )
                              }
                              onKeyDown={(evento) => {
                                if (
                                  evento.key ===
                                  "Enter"
                                ) {
                                  evento.preventDefault();
                                  ligar(vinculo);
                                }
                              }}
                              disabled={ocupado}
                              placeholder="Digite e escolha o insumo..."
                              className="min-w-56 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                ligar(vinculo)
                              }
                              disabled={ocupado}
                              className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {ocupado
                                ? "Ligando..."
                                : "Ligar"}
                            </button>
                          </div>
                        )}

                        {erroLinha[vinculo.id] && (
                          <p className="mt-2 text-xs font-semibold text-red-600">
                            {erroLinha[vinculo.id]}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
