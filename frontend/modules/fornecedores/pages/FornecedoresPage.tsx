"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import { Fornecedor } from "../types/fornecedor";

import {
  cnpjValido,
  cpfValido,
  formatarCnpj,
  formatarCpf,
  formatarTelefone,
  somenteDigitos,
} from "../domain/documentoFornecedor";

import {
  DESTINOS_ITEM_COMPRA,
  rotuloDestinoItemCompra,
} from "@/modules/compras/domain/destinoItemCompra";

type TipoDocumento = "CNPJ" | "CPF";

type FiltroSituacao = "ATIVOS" | "INATIVOS" | "TODOS";

interface FormularioFornecedor {
  // Vazio = novo fornecedor.
  id: string;
  tipoDocumento: TipoDocumento;
  documento: string;
  razaoSocial: string;
  nomeFantasia: string;
  telefone: string;
  email: string;
  destinoPadrao: string;
  observacao: string;
  ativo: boolean;
}

interface DadosCnpjPublico {
  razaoSocial: string;
  nomeFantasia?: string;
  telefone?: string;
  email?: string;
  situacaoCadastral?: string;
  ativa: boolean;
  municipio?: string;
  uf?: string;
}

interface ResultadoConsulta {
  tipo: "sucesso" | "alerta" | "erro";
  mensagem: string;
}

const FORMULARIO_VAZIO: FormularioFornecedor = {
  id: "",
  tipoDocumento: "CNPJ",
  documento: "",
  razaoSocial: "",
  nomeFantasia: "",
  telefone: "",
  email: "",
  destinoPadrao: "",
  observacao: "",
  ativo: true,
};

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100";

const CLASSE_ROTULO =
  "mb-2 block text-sm font-semibold text-slate-700";

function nomeExibicao(
  fornecedor: Fornecedor
): string {
  return (
    fornecedor.nomeFantasia ||
    fornecedor.razaoSocial
  );
}

function documentoExibicao(
  fornecedor: Fornecedor
): string {
  if (fornecedor.cnpj) {
    return formatarCnpj(fornecedor.cnpj);
  }

  if (fornecedor.cpf) {
    return formatarCpf(fornecedor.cpf);
  }

  return "—";
}

function formularioDoFornecedor(
  fornecedor: Fornecedor
): FormularioFornecedor {
  return {
    id: fornecedor.id,
    tipoDocumento: fornecedor.cpf
      ? "CPF"
      : "CNPJ",
    documento: fornecedor.cpf
      ? formatarCpf(fornecedor.cpf)
      : formatarCnpj(fornecedor.cnpj),
    razaoSocial: fornecedor.razaoSocial,
    nomeFantasia:
      fornecedor.nomeFantasia ?? "",
    telefone: formatarTelefone(
      fornecedor.telefone
    ),
    email: fornecedor.email ?? "",
    destinoPadrao:
      fornecedor.destinoPadrao ?? "",
    observacao:
      fornecedor.observacao ?? "",
    ativo: fornecedor.ativo,
  };
}

// Corpo aceito por POST /api/fornecedores e PUT /api/fornecedores/[id].
function montarPayload(
  formulario: FormularioFornecedor
) {
  const documento = somenteDigitos(
    formulario.documento
  );

  return {
    razaoSocial:
      formulario.razaoSocial.trim(),
    nomeFantasia:
      formulario.nomeFantasia.trim(),
    cnpj:
      formulario.tipoDocumento === "CNPJ"
        ? documento
        : "",
    cpf:
      formulario.tipoDocumento === "CPF"
        ? documento
        : "",
    telefone: somenteDigitos(
      formulario.telefone
    ),
    email: formulario.email.trim(),
    destinoPadrao:
      formulario.destinoPadrao,
    observacao:
      formulario.observacao.trim(),
    ativo: formulario.ativo,
  };
}

interface FornecedoresPageProps {
  // Vem da nova entrada, quando o QR traz um CNPJ não cadastrado.
  cnpjInicial?: string;
}

export default function FornecedoresPage({
  cnpjInicial,
}: FornecedoresPageProps) {
  const [fornecedores, setFornecedores] =
    useState<Fornecedor[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [busca, setBusca] = useState("");

  const [filtro, setFiltro] =
    useState<FiltroSituacao>("ATIVOS");

  const [formulario, setFormulario] =
    useState<FormularioFornecedor | null>(
      null
    );

  // Linha que está pedindo a confirmação de "Inativar".
  const [
    confirmandoInativacao,
    setConfirmandoInativacao,
  ] = useState<string | null>(null);

  const [salvando, setSalvando] =
    useState(false);

  const [consultando, setConsultando] =
    useState(false);

  const [resultadoConsulta, setResultadoConsulta] =
    useState<ResultadoConsulta | null>(null);

  const consultaInicialFeita = useRef(false);

  const formularioRef =
    useRef<HTMLElement | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro("");

      const resposta = await fetch(
        "/api/fornecedores",
        { cache: "no-store" }
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(
          dados.mensagem ||
            "Não foi possível carregar os fornecedores."
        );
      }

      const lista: Fornecedor[] =
        dados.fornecedores ?? [];

      setFornecedores(lista);

      return lista;
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os fornecedores."
      );

      return [];
    } finally {
      setCarregando(false);
    }
  }, []);

  // Procura um fornecedor já cadastrado com o mesmo documento.
  const encontrarDuplicado = useCallback(
    (
      lista: Fornecedor[],
      form: FormularioFornecedor
    ): Fornecedor | undefined => {
      const documento = somenteDigitos(
        form.documento
      );

      if (!documento) {
        return undefined;
      }

      return lista.find(
        (fornecedor) =>
          fornecedor.id !== form.id &&
          (form.tipoDocumento === "CNPJ"
            ? fornecedor.cnpj === documento
            : fornecedor.cpf === documento)
      );
    },
    []
  );

  const consultarCnpj = useCallback(
    async (
      form: FormularioFornecedor,
      lista: Fornecedor[]
    ) => {
      const cnpj = somenteDigitos(
        form.documento
      );

      if (!cnpjValido(cnpj)) {
        setResultadoConsulta({
          tipo: "erro",
          mensagem:
            "CNPJ inválido. Confira os números.",
        });

        return;
      }

      const duplicado = encontrarDuplicado(
        lista,
        form
      );

      if (duplicado) {
        setResultadoConsulta({
          tipo: "erro",
          mensagem: `Este CNPJ já está cadastrado: ${nomeExibicao(duplicado)}.`,
        });

        return;
      }

      setConsultando(true);
      setResultadoConsulta(null);

      try {
        const resposta = await fetch(
          `/api/fornecedores/consulta-cnpj?cnpj=${cnpj}`,
          { cache: "no-store" }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
          throw new Error(
            dados.mensagem ||
              "Não foi possível consultar o CNPJ agora. Preencha os dados manualmente."
          );
        }

        const publico: DadosCnpjPublico =
          dados.dados;

        setFormulario((atual) =>
          atual
            ? {
                ...atual,
                razaoSocial:
                  publico.razaoSocial,
                nomeFantasia:
                  publico.nomeFantasia ??
                  atual.nomeFantasia,
                telefone: publico.telefone
                  ? formatarTelefone(
                      publico.telefone
                    )
                  : atual.telefone,
                email:
                  publico.email ??
                  atual.email,
              }
            : atual
        );

        const local =
          publico.municipio && publico.uf
            ? ` (${publico.municipio}/${publico.uf})`
            : "";

        setResultadoConsulta(
          publico.ativa
            ? {
                tipo: "sucesso",
                mensagem: `Dados preenchidos pela consulta da Receita Federal${local}. Confira antes de salvar.`,
              }
            : {
                tipo: "alerta",
                mensagem: `Atenção: a situação deste CNPJ na Receita é "${publico.situacaoCadastral ?? "não informada"}"${local}. Confira antes de comprar deste fornecedor.`,
              }
        );
      } catch (error) {
        setResultadoConsulta({
          tipo: "erro",
          mensagem:
            error instanceof Error
              ? error.message
              : "Não foi possível consultar o CNPJ agora. Preencha os dados manualmente.",
        });
      } finally {
        setConsultando(false);
      }
    },
    [encontrarDuplicado]
  );

  useEffect(() => {
    void (async () => {
      const lista = await carregar();

      // Atalho da nova entrada: abre o cadastro com o CNPJ e já consulta.
      const cnpj = somenteDigitos(cnpjInicial);

      if (
        !cnpj ||
        consultaInicialFeita.current
      ) {
        return;
      }

      consultaInicialFeita.current = true;

      const form: FormularioFornecedor = {
        ...FORMULARIO_VAZIO,
        documento: formatarCnpj(cnpj),
      };

      setFormulario(form);

      await consultarCnpj(form, lista);
    })();
  }, [carregar, cnpjInicial, consultarCnpj]);

  const fornecedoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoDigitos = somenteDigitos(busca);

    return fornecedores.filter(
      (fornecedor) => {
        if (
          filtro === "ATIVOS" &&
          !fornecedor.ativo
        ) {
          return false;
        }

        if (
          filtro === "INATIVOS" &&
          fornecedor.ativo
        ) {
          return false;
        }

        if (!termo) {
          return true;
        }

        const nomes = `${fornecedor.razaoSocial} ${fornecedor.nomeFantasia ?? ""}`.toLowerCase();

        const documento =
          fornecedor.cnpj ??
          fornecedor.cpf ??
          "";

        return (
          nomes.includes(termo) ||
          (termoDigitos.length > 0 &&
            documento.includes(termoDigitos))
        );
      }
    );
  }, [busca, filtro, fornecedores]);

  const totalAtivos = fornecedores.filter(
    (fornecedor) => fornecedor.ativo
  ).length;

  function abrirFormulario(
    form: FormularioFornecedor
  ) {
    setFormulario(form);
    setResultadoConsulta(null);
    setErro("");
    setAviso("");

    requestAnimationFrame(() => {
      formularioRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function alterarCampo<
    K extends keyof FormularioFornecedor,
  >(
    campo: K,
    valor: FormularioFornecedor[K]
  ) {
    setFormulario((atual) =>
      atual
        ? { ...atual, [campo]: valor }
        : atual
    );
  }

  function alterarTipoDocumento(
    tipo: TipoDocumento
  ) {
    setFormulario((atual) =>
      atual
        ? {
            ...atual,
            tipoDocumento: tipo,
            documento: "",
          }
        : atual
    );

    setResultadoConsulta(null);
  }

  function alterarDocumento(valor: string) {
    if (!formulario) {
      return;
    }

    alterarCampo(
      "documento",
      formulario.tipoDocumento === "CNPJ"
        ? formatarCnpj(valor)
        : formatarCpf(valor)
    );

    setResultadoConsulta(null);
  }

  // Aviso de dígitos errados assim que o documento está completo.
  const avisoDocumento = useMemo(() => {
    if (!formulario) {
      return "";
    }

    const digitos = somenteDigitos(
      formulario.documento
    );

    // Cadastro antigo: só confere se o documento foi alterado (regra 9.15).
    const original = fornecedores.find(
      (fornecedor) =>
        fornecedor.id === formulario.id
    );

    if (
      original &&
      digitos ===
        (formulario.tipoDocumento === "CNPJ"
          ? original.cnpj
          : original.cpf)
    ) {
      return "";
    }

    if (formulario.tipoDocumento === "CNPJ") {
      return digitos.length === 14 &&
        !cnpjValido(digitos)
        ? "CNPJ inválido. Confira os números."
        : "";
    }

    return digitos.length === 11 &&
      !cpfValido(digitos)
      ? "CPF inválido. Confira os números."
      : "";
  }, [formulario, fornecedores]);

  async function salvar() {
    if (!formulario) {
      return;
    }

    if (!formulario.razaoSocial.trim()) {
      setErro(
        formulario.tipoDocumento === "CPF"
          ? "Informe o nome do fornecedor."
          : "Informe a razão social do fornecedor."
      );

      return;
    }

    if (!somenteDigitos(formulario.documento)) {
      setErro(
        `Informe o ${formulario.tipoDocumento} do fornecedor.`
      );

      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const novo = !formulario.id;

      const resposta = await fetch(
        novo
          ? "/api/fornecedores"
          : `/api/fornecedores/${formulario.id}`,
        {
          method: novo ? "POST" : "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            montarPayload(formulario)
          ),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(
          dados.mensagem ||
            "Não foi possível salvar o fornecedor."
        );
      }

      const nome = nomeExibicao(
        dados.fornecedor
      );

      setFormulario(null);
      setResultadoConsulta(null);

      setAviso(
        novo && cnpjInicial
          ? `${nome} foi cadastrado. Volte para a aba da entrada e clique em "Atualizar lista".`
          : novo
            ? `${nome} foi cadastrado.`
            : `${nome} foi atualizado.`
      );

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o fornecedor."
      );
    } finally {
      setSalvando(false);
    }
  }

  // Fornecedor não é excluído: só inativado (sai da lista da nova entrada).
  async function alterarSituacao(
    fornecedor: Fornecedor
  ) {
    const nome = nomeExibicao(fornecedor);

    setConfirmandoInativacao(null);
    setErro("");
    setAviso("");

    try {
      const resposta = await fetch(
        `/api/fornecedores/${fornecedor.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            montarPayload({
              ...formularioDoFornecedor(
                fornecedor
              ),
              ativo: !fornecedor.ativo,
            })
          ),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(
          dados.mensagem ||
            "Não foi possível alterar a situação do fornecedor."
        );
      }

      setAviso(
        fornecedor.ativo
          ? `${nome} foi inativado.`
          : `${nome} foi reativado.`
      );

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a situação do fornecedor."
      );
    }
  }

  const ehCnpj =
    formulario?.tipoDocumento === "CNPJ";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/compras"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Compras
          </Link>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Fornecedores
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Cadastro dos fornecedores usados
            nas entradas de compra. Com o
            CNPJ, os dados vêm da Receita
            Federal.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            abrirFormulario(FORMULARIO_VAZIO)
          }
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          + Novo fornecedor
        </button>
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

      {formulario && (
        <section
          ref={formularioRef}
          className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              {formulario.id
                ? "Editar fornecedor"
                : "Novo fornecedor"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {ehCnpj
                ? "Digite o CNPJ e clique em Buscar dados: a razão social, o nome fantasia e o contato vêm preenchidos."
                : "Fornecedor informal (pessoa física): preencha os dados manualmente."}
            </p>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <span className={CLASSE_ROTULO}>
                Documento *
              </span>

              <div className="inline-flex rounded-xl border border-slate-300 p-1">
                {(
                  ["CNPJ", "CPF"] as TipoDocumento[]
                ).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() =>
                      alterarTipoDocumento(tipo)
                    }
                    disabled={salvando}
                    className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      formulario.tipoDocumento ===
                      tipo
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tipo === "CNPJ"
                      ? "CNPJ (empresa)"
                      : "CPF (informal)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="documento"
                className={CLASSE_ROTULO}
              >
                {formulario.tipoDocumento} *
              </label>

              <div className="flex flex-wrap gap-3">
                <input
                  id="documento"
                  inputMode="numeric"
                  value={formulario.documento}
                  onChange={(evento) =>
                    alterarDocumento(
                      evento.target.value
                    )
                  }
                  onKeyDown={(evento) => {
                    if (
                      evento.key === "Enter" &&
                      ehCnpj
                    ) {
                      evento.preventDefault();

                      void consultarCnpj(
                        formulario,
                        fornecedores
                      );
                    }
                  }}
                  disabled={salvando}
                  placeholder={
                    ehCnpj
                      ? "00.000.000/0000-00"
                      : "000.000.000-00"
                  }
                  className={`${CLASSE_CAMPO} min-w-56 flex-1 font-mono sm:max-w-xs`}
                />

                {ehCnpj && (
                  <button
                    type="button"
                    onClick={() =>
                      void consultarCnpj(
                        formulario,
                        fornecedores
                      )
                    }
                    disabled={
                      consultando ||
                      salvando ||
                      somenteDigitos(
                        formulario.documento
                      ).length !== 14
                    }
                    className="cursor-pointer whitespace-nowrap rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {consultando
                      ? "Buscando..."
                      : "🔎 Buscar dados pelo CNPJ"}
                  </button>
                )}
              </div>

              {avisoDocumento && (
                <p className="mt-2 text-sm font-semibold text-red-600">
                  {avisoDocumento}
                </p>
              )}

              {resultadoConsulta && (
                <p
                  className={`mt-3 rounded-xl px-4 py-3 text-sm ${
                    resultadoConsulta.tipo ===
                    "sucesso"
                      ? "border border-sky-200 bg-sky-50 text-sky-800"
                      : resultadoConsulta.tipo ===
                          "alerta"
                        ? "border border-amber-200 bg-amber-50 text-amber-800"
                        : "border border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {resultadoConsulta.mensagem}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="razaoSocial"
                className={CLASSE_ROTULO}
              >
                {ehCnpj
                  ? "Razão social *"
                  : "Nome completo *"}
              </label>

              <input
                id="razaoSocial"
                value={formulario.razaoSocial}
                onChange={(evento) =>
                  alterarCampo(
                    "razaoSocial",
                    evento.target.value
                  )
                }
                disabled={salvando}
                className={CLASSE_CAMPO}
              />
            </div>

            <div>
              <label
                htmlFor="nomeFantasia"
                className={CLASSE_ROTULO}
              >
                {ehCnpj
                  ? "Nome fantasia"
                  : "Apelido / como é conhecido"}
              </label>

              <input
                id="nomeFantasia"
                value={formulario.nomeFantasia}
                onChange={(evento) =>
                  alterarCampo(
                    "nomeFantasia",
                    evento.target.value
                  )
                }
                disabled={salvando}
                className={CLASSE_CAMPO}
              />
            </div>

            <div>
              <label
                htmlFor="telefone"
                className={CLASSE_ROTULO}
              >
                Telefone
              </label>

              <input
                id="telefone"
                inputMode="tel"
                value={formulario.telefone}
                onChange={(evento) =>
                  alterarCampo(
                    "telefone",
                    formatarTelefone(
                      evento.target.value
                    )
                  )
                }
                disabled={salvando}
                placeholder="(00) 00000-0000"
                className={CLASSE_CAMPO}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className={CLASSE_ROTULO}
              >
                E-mail
              </label>

              <input
                id="email"
                type="email"
                value={formulario.email}
                onChange={(evento) =>
                  alterarCampo(
                    "email",
                    evento.target.value
                  )
                }
                disabled={salvando}
                className={CLASSE_CAMPO}
              />
            </div>

            <div>
              <label
                htmlFor="destinoPadrao"
                className={CLASSE_ROTULO}
              >
                Destino padrão dos itens
              </label>

              <select
                id="destinoPadrao"
                value={formulario.destinoPadrao}
                onChange={(evento) =>
                  alterarCampo(
                    "destinoPadrao",
                    evento.target.value
                  )
                }
                disabled={salvando}
                className={CLASSE_CAMPO}
              >
                <option value="">
                  Sem destino padrão
                </option>

                {DESTINOS_ITEM_COMPRA.map(
                  (destino) => (
                    <option
                      key={destino.valor}
                      value={destino.valor}
                    >
                      {destino.rotulo}
                    </option>
                  )
                )}
              </select>

              <p className="mt-2 text-xs text-slate-500">
                Sugerido para os itens novos
                deste fornecedor. Você sempre
                confere antes de salvar.
              </p>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="observacao"
                className={CLASSE_ROTULO}
              >
                Observação
              </label>

              <textarea
                id="observacao"
                rows={3}
                value={formulario.observacao}
                onChange={(evento) =>
                  alterarCampo(
                    "observacao",
                    evento.target.value
                  )
                }
                disabled={salvando}
                placeholder="Ex.: entrega às terças, pedido mínimo, contato do vendedor..."
                className={CLASSE_CAMPO}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setFormulario(null);
                setResultadoConsulta(null);
                setErro("");
              }}
              disabled={salvando}
              className="cursor-pointer rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => void salvar()}
              disabled={
                salvando ||
                consultando ||
                Boolean(avisoDocumento)
              }
              className="cursor-pointer rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando
                ? "Salvando..."
                : "Salvar fornecedor"}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Fornecedores cadastrados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {totalAtivos} ativo(s) de{" "}
              {fornecedores.length}.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl border border-slate-300 p-1">
              {(
                [
                  ["ATIVOS", "Ativos"],
                  ["INATIVOS", "Inativos"],
                  ["TODOS", "Todos"],
                ] as [FiltroSituacao, string][]
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() =>
                    setFiltro(valor)
                  }
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
              placeholder="Buscar nome, CNPJ ou CPF..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 lg:w-80"
            />
          </div>
        </div>

        {carregando ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Carregando fornecedores...
          </div>
        ) : fornecedoresFiltrados.length ===
          0 ? (
          <div className="p-10 text-center">
            <p className="text-base font-semibold text-slate-800">
              Nenhum fornecedor encontrado
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {fornecedores.length === 0
                ? "Cadastre o primeiro fornecedor para começar."
                : "Ajuste a busca ou o filtro."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Fornecedor
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Documento
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Telefone
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Destino padrão
                  </th>

                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Situação
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {fornecedoresFiltrados.map(
                  (fornecedor) => (
                    <tr
                      key={fornecedor.id}
                      className={
                        fornecedor.ativo
                          ? ""
                          : "bg-slate-50 text-slate-500"
                      }
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {nomeExibicao(
                            fornecedor
                          )}
                        </p>

                        {fornecedor.nomeFantasia && (
                          <p className="text-xs text-slate-500">
                            {
                              fornecedor.razaoSocial
                            }
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-mono text-sm text-slate-700">
                        {documentoExibicao(
                          fornecedor
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                        {fornecedor.telefone
                          ? formatarTelefone(
                              fornecedor.telefone
                            )
                          : "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                        {fornecedor.destinoPadrao
                          ? rotuloDestinoItemCompra(
                              fornecedor.destinoPadrao
                            )
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            fornecedor.ativo
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {fornecedor.ativo
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {confirmandoInativacao ===
                        fornecedor.id ? (
                          // Confirmação na própria linha: age na hora, sem "Salvar".
                          <span className="inline-flex items-center gap-3 rounded-xl bg-red-50 px-3 py-2 text-sm">
                            <span className="font-semibold text-red-700">
                              Inativar?
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                void alterarSituacao(
                                  fornecedor
                                )
                              }
                              className="cursor-pointer rounded-lg bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-700"
                            >
                              Sim, inativar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setConfirmandoInativacao(
                                  null
                                )
                              }
                              className="cursor-pointer font-semibold text-slate-600 hover:text-slate-900"
                            >
                              Não
                            </button>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                abrirFormulario(
                                  formularioDoFornecedor(
                                    fornecedor
                                  )
                                )
                              }
                              className="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (fornecedor.ativo) {
                                  setConfirmandoInativacao(
                                    fornecedor.id
                                  );
                                } else {
                                  void alterarSituacao(
                                    fornecedor
                                  );
                                }
                              }}
                              className={`ml-4 cursor-pointer text-sm font-semibold ${
                                fornecedor.ativo
                                  ? "text-red-600 hover:text-red-700"
                                  : "text-emerald-600 hover:text-emerald-700"
                              }`}
                            >
                              {fornecedor.ativo
                                ? "Inativar"
                                : "Reativar"}
                            </button>
                          </>
                        )}
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
  );
}
