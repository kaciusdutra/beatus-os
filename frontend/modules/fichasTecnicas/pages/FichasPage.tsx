"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import {
  calcularCustoFichaTecnica,
  type ResultadoCustoFichaTecnica,
} from "../services/calcularCustoFichaTecnica";

import {
  converterSeCompativel,
} from "../services/conversaoUnidade";

import {
  carregarDadosFichas,
  formatarCustoFino,
  formatarMoeda,
  montarContextoCusto,
  type DadosFichas,
} from "./dadosFichas";

import {
  CATEGORIAS_PRODUTO,
} from "@/modules/produtos/types/produto";

type Aba = "PREPARACAO" | "PRODUTO";

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export default function FichasPage() {
  const router = useRouter();

  const [dados, setDados] =
    useState<DadosFichas | null>(null);

  const [erro, setErro] = useState("");

  const [aba, setAba] = useState<Aba>("PREPARACAO");

  const [busca, setBusca] = useState("");

  const [mostrarInativas, setMostrarInativas] =
    useState(false);

  const [painelProduto, setPainelProduto] =
    useState(false);

  const [produtoEscolhido, setProdutoEscolhido] =
    useState("");

  const [novoNome, setNovoNome] = useState("");

  const [novaCategoria, setNovaCategoria] =
    useState<string>("HAMBÚRGUER");

  const [novaDescricao, setNovaDescricao] =
    useState("");

  const [criandoProduto, setCriandoProduto] =
    useState(false);

  useEffect(() => {
    void carregarDadosFichas()
      .then(setDados)
      .catch((error) =>
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as fichas."
        )
      );
  }, []);

  // Custo de cada ficha, com os preços atuais dos insumos.
  const custos = useMemo(() => {
    const mapa = new Map<
      string,
      ResultadoCustoFichaTecnica
    >();

    if (!dados) {
      return mapa;
    }

    const contexto = montarContextoCusto(
      dados,
      dados.fichas
    );

    const cache = new Map<
      string,
      ResultadoCustoFichaTecnica
    >();

    for (const ficha of dados.fichas) {
      mapa.set(
        ficha.id,
        calcularCustoFichaTecnica(
          ficha,
          contexto,
          [],
          cache
        )
      );
    }

    return mapa;
  }, [dados]);

  const produtoPorId = useMemo(
    () =>
      new Map(
        (dados?.produtos ?? []).map((produto) => [
          produto.id,
          produto,
        ])
      ),
    [dados]
  );

  const produtosSemFicha = useMemo(() => {
    const comFicha = new Set(
      (dados?.fichas ?? [])
        .map((ficha) => ficha.produtoId)
        .filter(Boolean)
    );

    return (dados?.produtos ?? []).filter(
      (produto) =>
        produto.ativo && !comFicha.has(produto.id)
    );
  }, [dados]);

  const fichasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return (dados?.fichas ?? []).filter((ficha) => {
      if (ficha.tipo !== aba) {
        return false;
      }

      if (!mostrarInativas && !ficha.ativo) {
        return false;
      }

      return (
        !termo ||
        ficha.nome.toLowerCase().includes(termo)
      );
    });
  }, [aba, busca, dados, mostrarInativas]);

  async function criarProdutoENovaFicha() {
    setErro("");
    setCriandoProduto(true);

    try {
      const resposta = await fetch("/api/produtos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: novoNome,
          categoria: novaCategoria,
          descricao: novaDescricao,
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok || !resultado.sucesso) {
        throw new Error(
          resultado.mensagem ??
            "Não foi possível criar o produto."
        );
      }

      router.push(
        `/fichas/nova?tipo=PRODUTO&produtoId=${resultado.produto.id}`
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o produto."
      );

      setCriandoProduto(false);
    }
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
            Fichas técnicas
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Monte as preparações (blend, molhos,
            maioneses) e os produtos (Agnus, combos).
            Uma ficha pode usar outras fichas, e o custo
            de cada porção aparece na hora, com os
            preços atuais dos insumos.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/fichas/nova?tipo=PREPARACAO"
            className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            + Nova preparação
          </Link>

          <button
            type="button"
            onClick={() => {
              setAba("PRODUTO");
              setPainelProduto((aberto) => !aberto);
            }}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            + Ficha de produto
          </button>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {painelProduto && dados && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Ficha de produto
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Escolha um produto que ainda não tem ficha ou
              cadastre um novo (burger, combo...). O preço
              de venda não fica no produto: ele vem da
              precificação.
            </p>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-2">
            <div className="space-y-3">
              <label
                htmlFor="produto-existente"
                className="block text-sm font-semibold text-slate-700"
              >
                Produto já cadastrado
              </label>

              <select
                id="produto-existente"
                value={produtoEscolhido}
                onChange={(evento) =>
                  setProdutoEscolhido(evento.target.value)
                }
                className={CLASSE_CAMPO}
              >
                <option value="">
                  {produtosSemFicha.length === 0
                    ? "Todos os produtos já têm ficha"
                    : "Selecione o produto..."}
                </option>

                {produtosSemFicha.map((produto) => (
                  <option
                    key={produto.id}
                    value={produto.id}
                  >
                    {produto.nome} ({produto.categoria})
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!produtoEscolhido}
                onClick={() =>
                  router.push(
                    `/fichas/nova?tipo=PRODUTO&produtoId=${produtoEscolhido}`
                  )
                }
                className="cursor-pointer rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Criar ficha deste produto
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                Ou cadastre um produto novo
              </p>

              <input
                value={novoNome}
                onChange={(evento) =>
                  setNovoNome(evento.target.value)
                }
                placeholder="Nome (ex.: Combo Agnus)"
                className={CLASSE_CAMPO}
              />

              <select
                value={novaCategoria}
                onChange={(evento) =>
                  setNovaCategoria(evento.target.value)
                }
                className={CLASSE_CAMPO}
              >
                {CATEGORIAS_PRODUTO.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>

              <input
                value={novaDescricao}
                onChange={(evento) =>
                  setNovaDescricao(evento.target.value)
                }
                placeholder="Descrição (opcional)"
                className={CLASSE_CAMPO}
              />

              <button
                type="button"
                disabled={criandoProduto || !novoNome.trim()}
                onClick={() =>
                  void criarProdutoENovaFicha()
                }
                className="cursor-pointer rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {criandoProduto
                  ? "Criando..."
                  : "Cadastrar produto e montar a ficha"}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-xl border border-slate-300 p-1">
            {(
              [
                ["PREPARACAO", "Preparações"],
                ["PRODUTO", "Produtos"],
              ] as [Aba, string][]
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setAba(valor)}
                className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                  aba === valor
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={mostrarInativas}
                onChange={(evento) =>
                  setMostrarInativas(evento.target.checked)
                }
                className="h-4 w-4 cursor-pointer"
              />
              Mostrar inativas
            </label>

            <input
              type="text"
              value={busca}
              onChange={(evento) =>
                setBusca(evento.target.value)
              }
              placeholder="Buscar ficha..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 lg:w-72"
            />
          </div>
        </div>

        {!dados && !erro ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Carregando fichas...
          </div>
        ) : fichasFiltradas.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-base font-semibold text-slate-800">
              Nenhuma ficha encontrada
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {(dados?.fichas.length ?? 0) === 0
                ? "Comece pelas preparações (blend, béchamel, molhos) e depois monte os produtos."
                : "Ajuste a busca ou troque de aba."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  {[
                    "Ficha",
                    aba === "PREPARACAO"
                      ? "Rendimento"
                      : "Categoria",
                    "Itens",
                    "Custo total",
                    aba === "PREPARACAO"
                      ? "Custo por unidade"
                      : "Situação do custo",
                    ...(aba === "PREPARACAO"
                      ? ["Custo da porção"]
                      : []),
                    "",
                  ].map((titulo, indice) => (
                    <th
                      key={`${titulo}-${indice}`}
                      className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {fichasFiltradas.map((ficha) => {
                  const custo = custos.get(ficha.id);

                  const produto = ficha.produtoId
                    ? produtoPorId.get(ficha.produtoId)
                    : undefined;

                  return (
                    <tr
                      key={ficha.id}
                      className={
                        ficha.ativo
                          ? ""
                          : "bg-slate-50 text-slate-500"
                      }
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {ficha.nome}
                        </p>

                        {!ficha.ativo && (
                          <p className="text-xs text-slate-500">
                            Inativa
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                        {ficha.tipo === "PREPARACAO"
                          ? `${ficha.rendimento ?? "—"} ${ficha.unidadeRendimento ?? ""}`
                          : (produto?.categoria ?? "—")}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {ficha.itens.length}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-900">
                        {custo
                          ? formatarMoeda(custo.custoTotal)
                          : "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm">
                        {!custo ? (
                          "—"
                        ) : !custo.completo ? (
                          <span
                            title={custo.erros.join(" | ")}
                            className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                          >
                            Com pendências
                          </span>
                        ) : ficha.tipo === "PREPARACAO" ? (
                          <span className="text-slate-700">
                            {formatarCustoFino(
                              custo.custoPorUnidade ?? 0
                            )}{" "}
                            / {ficha.unidadeRendimento}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Completo
                          </span>
                        )}
                      </td>

                      {aba === "PREPARACAO" && (
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                          {(() => {
                            if (
                              !custo?.completo ||
                              ficha.porcaoQuantidade ===
                                undefined ||
                              !ficha.porcaoUnidade ||
                              custo.custoPorUnidade ===
                                undefined
                            ) {
                              return "—";
                            }

                            const naUnidade =
                              converterSeCompativel(
                                ficha.porcaoQuantidade,
                                ficha.porcaoUnidade,
                                ficha.unidadeRendimento ?? ""
                              );

                            return naUnidade === undefined
                              ? "—"
                              : `${formatarCustoFino(
                                  naUnidade *
                                    custo.custoPorUnidade
                                )} (${ficha.porcaoQuantidade} ${ficha.porcaoUnidade})`;
                          })()}
                        </td>
                      )}

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <Link
                          href={`/fichas/${ficha.id}/producao`}
                          className="mr-4 cursor-pointer text-sm font-semibold text-sky-700 hover:text-sky-900"
                        >
                          Produção
                        </Link>

                        <Link
                          href={`/fichas/${ficha.id}`}
                          className="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900"
                        >
                          Abrir
                        </Link>
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
