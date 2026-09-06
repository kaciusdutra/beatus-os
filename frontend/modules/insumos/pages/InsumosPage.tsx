"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

interface CategoriaInsumo {
  id: string;
  nome: string;
  ativo: boolean;
}

interface UnidadeMedida {
  id: string;
  nome: string;
  abreviacao: string;
  ativo: boolean;
}

interface Insumo {
  id: string;
  nome: string;

  categoriaId: string;

  unidadeCompraId: string;

  quantidadeCompra: number;
  precoCompra: number;
  custoUnitario: number;

  fornecedorId?: string;

  ativo: boolean;

  observacao?: string;

  criadoEm: string;
  atualizadoEm: string;
}

interface FormularioInsumo {
  nome: string;
  categoriaId: string;
  unidadeCompraId: string;
  quantidadeCompra: string;
  precoCompra: string;
  fornecedorId: string;
  observacao: string;
}

const formularioInicial: FormularioInsumo = {
  nome: "",
  categoriaId: "",
  unidadeCompraId: "",
  quantidadeCompra: "1",
  precoCompra: "",
  fornecedorId: "",
  observacao: "",
};

function formatarMoeda(
  valor: number
): string {
  return valor.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

export default function InsumosPage() {
  const [insumos, setInsumos] =
    useState<Insumo[]>([]);

  const [categorias, setCategorias] =
    useState<CategoriaInsumo[]>([]);

  const [unidades, setUnidades] =
    useState<UnidadeMedida[]>([]);

  const [formulario, setFormulario] =
    useState<FormularioInsumo>(
      formularioInicial
    );

  const [busca, setBusca] =
    useState("");

  const [
    categoriaFiltro,
    setCategoriaFiltro,
  ] = useState("TODAS");

  const [modalAberto, setModalAberto] =
    useState(false);

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro("");

      const [
        respostaInsumos,
        respostaCategorias,
        respostaUnidades,
      ] = await Promise.all([
        fetch(
          "/api/insumos",
          {
            cache: "no-store",
          }
        ),
        fetch(
          "/api/insumos/categorias",
          {
            cache: "no-store",
          }
        ),
        fetch(
          "/api/insumos/unidades",
          {
            cache: "no-store",
          }
        ),
      ]);

      const [
        dadosInsumos,
        dadosCategorias,
        dadosUnidades,
      ] = await Promise.all([
        respostaInsumos.json(),
        respostaCategorias.json(),
        respostaUnidades.json(),
      ]);

      if (!respostaInsumos.ok) {
        throw new Error(
          dadosInsumos.erro ??
            "Não foi possível carregar os insumos."
        );
      }

      if (!respostaCategorias.ok) {
        throw new Error(
          dadosCategorias.erro ??
            "Não foi possível carregar as categorias."
        );
      }

      if (!respostaUnidades.ok) {
        throw new Error(
          dadosUnidades.erro ??
            "Não foi possível carregar as unidades."
        );
      }

      setInsumos(
        dadosInsumos.insumos ?? []
      );

      setCategorias(
        dadosCategorias.categorias ?? []
      );

      setUnidades(
        dadosUnidades.unidades ?? []
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar dados."
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregarDados();
  }, []);

  const custoCalculado = useMemo(() => {
    const quantidade =
      Number(
        formulario.quantidadeCompra
      );

    const preco =
      Number(
        formulario.precoCompra
      );

    if (
      !Number.isFinite(quantidade) ||
      quantidade <= 0 ||
      !Number.isFinite(preco) ||
      preco < 0
    ) {
      return 0;
    }

    return preco / quantidade;
  }, [
    formulario.quantidadeCompra,
    formulario.precoCompra,
  ]);

  const insumosFiltrados =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLocaleLowerCase(
            "pt-BR"
          );

      return insumos.filter(
        (insumo) => {
          const categoria =
            categorias.find(
              (item) =>
                item.id ===
                insumo.categoriaId
            );

          const correspondeBusca =
            !termo ||
            insumo.nome
              .toLocaleLowerCase(
                "pt-BR"
              )
              .includes(termo) ||
            categoria?.nome
              .toLocaleLowerCase(
                "pt-BR"
              )
              .includes(termo);

          const correspondeCategoria =
            categoriaFiltro ===
              "TODAS" ||
            insumo.categoriaId ===
              categoriaFiltro;

          return (
            correspondeBusca &&
            correspondeCategoria
          );
        }
      );
    }, [
      busca,
      categoriaFiltro,
      categorias,
      insumos,
    ]);

  const alterarCampo = (
    campo: keyof FormularioInsumo,
    valor: string
  ) => {
    setFormulario(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      })
    );
  };

  const abrirNovoInsumo = () => {
    setFormulario({
      ...formularioInicial,
      categoriaId:
        categorias[0]?.id ?? "",
      unidadeCompraId:
        unidades[0]?.id ?? "",
    });

    setErro("");
    setModalAberto(true);
  };

  const fecharModal = () => {
    if (salvando) {
      return;
    }

    setModalAberto(false);
  };

  const salvarInsumo = async (
    evento: FormEvent<HTMLFormElement>
  ) => {
    evento.preventDefault();

    try {
      setSalvando(true);
      setErro("");

      const quantidade =
        Number(
          formulario.quantidadeCompra
        );

      const preco =
        Number(
          formulario.precoCompra
        );

      if (
        !formulario.nome.trim()
      ) {
        throw new Error(
          "Informe o nome do insumo."
        );
      }

      if (
        !formulario.categoriaId
      ) {
        throw new Error(
          "Selecione a categoria."
        );
      }

      if (
        !formulario.unidadeCompraId
      ) {
        throw new Error(
          "Selecione a unidade de compra."
        );
      }

      if (
        !Number.isFinite(
          quantidade
        ) ||
        quantidade <= 0
      ) {
        throw new Error(
          "A quantidade de compra deve ser maior que zero."
        );
      }

      if (
        !Number.isFinite(
          preco
        ) ||
        preco < 0
      ) {
        throw new Error(
          "Informe um preço de compra válido."
        );
      }

      const resposta =
        await fetch(
          "/api/insumos",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json; charset=utf-8",
            },
            body:
              JSON.stringify({
                nome:
                  formulario.nome,
                categoriaId:
                  formulario.categoriaId,
                unidadeCompraId:
                  formulario.unidadeCompraId,
                quantidadeCompra:
                  quantidade,
                precoCompra:
                  preco,
                fornecedorId:
                  formulario.fornecedorId ||
                  undefined,
                observacao:
                  formulario.observacao ||
                  undefined,
              }),
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro ??
            "Não foi possível salvar o insumo."
        );
      }

      setInsumos(
        (anteriores) =>
          [
            ...anteriores,
            dados.insumo,
          ].sort(
            (a, b) =>
              a.nome.localeCompare(
                b.nome,
                "pt-BR"
              )
          )
      );

      setFormulario(
        formularioInicial
      );

      setModalAberto(false);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao salvar insumo."
      );
    } finally {
      setSalvando(false);
    }
  };

  const quantidadeTotal =
    insumos.length;

  const insumosAtivos =
    insumos.filter(
      (insumo) =>
        insumo.ativo
    ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Estoque
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Insumos
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Cadastre os ingredientes e materiais
            utilizados pelo Beatus.
          </p>
        </div>

        <button
          type="button"
          onClick={
            abrirNovoInsumo
          }
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          + Novo insumo
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total de insumos
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {quantidadeTotal}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Insumos ativos
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {insumosAtivos}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Exibidos
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {
              insumosFiltrados.length
            }
          </p>
        </div>
      </div>

      {erro &&
        !modalAberto && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={busca}
              onChange={(evento) =>
                setBusca(
                  evento.target.value
                )
              }
              placeholder="Buscar insumo..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="w-full lg:w-64">
            <select
              value={
                categoriaFiltro
              }
              onChange={(
                evento
              ) =>
                setCategoriaFiltro(
                  evento.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="TODAS">
                Todas as categorias
              </option>

              {categorias.map(
                (categoria) => (
                  <option
                    key={
                      categoria.id
                    }
                    value={
                      categoria.id
                    }
                  >
                    {categoria.nome}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {carregando ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Carregando insumos...
          </div>
        ) : insumosFiltrados.length ===
          0 ? (
          <div className="p-10 text-center">
            <p className="text-base font-semibold text-slate-800">
              Nenhum insumo encontrado
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {insumos.length ===
              0
                ? "Cadastre o primeiro insumo para começar."
                : "Ajuste os filtros para encontrar o insumo desejado."}
            </p>

            {insumos.length ===
              0 && (
              <button
                type="button"
                onClick={
                  abrirNovoInsumo
                }
                className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Cadastrar primeiro
                insumo
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Insumo
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Categoria
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Unidade
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Compra
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Custo unitário
                  </th>

                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {insumosFiltrados.map(
                  (insumo) => {
                    const categoria =
                      categorias.find(
                        (item) =>
                          item.id ===
                          insumo.categoriaId
                      );

                    const unidade =
                      unidades.find(
                        (item) =>
                          item.id ===
                          insumo.unidadeCompraId
                      );

                    return (
                      <tr
                        key={
                          insumo.id
                        }
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {insumo.nome}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {categoria?.nome ??
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {unidade?.abreviacao ??
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-right text-sm text-slate-700">
                          {formatarMoeda(
                            insumo.precoCompra
                          )}
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                          {formatarMoeda(
                            insumo.custoUnitario
                          )}

                          <span className="ml-1 text-xs font-normal text-slate-400">
                            /{" "}
                            {unidade?.abreviacao ??
                              ""}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              insumo.ativo
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {insumo.ativo
                              ? "Ativo"
                              : "Inativo"}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Novo insumo
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Cadastre o ingrediente ou material usado pelo Beatus.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  fecharModal
                }
                disabled={
                  salvando
                }
                className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                salvarInsumo
              }
              className="space-y-5 p-6"
            >
              {erro && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="nome"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Nome *
                  </label>

                  <input
                    id="nome"
                    value={
                      formulario.nome
                    }
                    onChange={(
                      evento
                    ) =>
                      alterarCampo(
                        "nome",
                        evento.target.value
                      )
                    }
                    placeholder="Ex.: Bacon"
                    autoFocus
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label
                    htmlFor="categoriaId"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Categoria *
                  </label>

                  <select
                    id="categoriaId"
                    value={
                      formulario.categoriaId
                    }
                    onChange={(
                      evento
                    ) =>
                      alterarCampo(
                        "categoriaId",
                        evento.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">
                      Selecione...
                    </option>

                    {categorias.map(
                      (categoria) => (
                        <option
                          key={
                            categoria.id
                          }
                          value={
                            categoria.id
                          }
                        >
                          {categoria.nome}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="unidadeCompraId"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Unidade de compra *
                  </label>

                  <select
                    id="unidadeCompraId"
                    value={
                      formulario.unidadeCompraId
                    }
                    onChange={(
                      evento
                    ) =>
                      alterarCampo(
                        "unidadeCompraId",
                        evento.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">
                      Selecione...
                    </option>

                    {unidades.map(
                      (unidade) => (
                        <option
                          key={
                            unidade.id
                          }
                          value={
                            unidade.id
                          }
                        >
                          {unidade.nome} (
                          {
                            unidade.abreviacao
                          }
                          )
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="quantidadeCompra"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Quantidade da compra *
                  </label>

                  <input
                    id="quantidadeCompra"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={
                      formulario.quantidadeCompra
                    }
                    onChange={(
                      evento
                    ) =>
                      alterarCampo(
                        "quantidadeCompra",
                        evento.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label
                    htmlFor="precoCompra"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Valor total compra *
                  </label>

                  <input
                    id="precoCompra"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      formulario.precoCompra
                    }
                    onChange={(
                      evento
                    ) =>
                      alterarCampo(
                        "precoCompra",
                        evento.target.value
                      )
                    }
                    placeholder="0,00"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    CUSTO POR UNIDADE
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatarMoeda(
                      custoCalculado
                    )}

                    <span className="ml-2 text-sm font-medium text-slate-500">
                      /{" "}
                      {
                        unidades.find(
                          (
                            unidade
                          ) =>
                            unidade.id ===
                            formulario.unidadeCompraId
                        )
                          ?.abreviacao
                      }
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Valor total da compra ÷ quantidade da compra
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="fornecedorId"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Fornecedor
                  </label>

                  <input
                    id="fornecedorId"
                    value={
                      formulario.fornecedorId
                    }
                    onChange={(
                      evento
                    ) =>
                      alterarCampo(
                        "fornecedorId",
                        evento.target.value
                      )
                    }
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="observacao"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Observação
                  </label>

                  <textarea
                    id="observacao"
                    rows={3}
                    value={
                      formulario.observacao
                    }
                    onChange={(
                      evento
                    ) =>
                      alterarCampo(
                        "observacao",
                        evento.target.value
                      )
                    }
                    placeholder="Opcional"
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    fecharModal
                  }
                  disabled={
                    salvando
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    salvando
                  }
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando
                    ? "Salvando..."
                    : "Salvar insumo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}