"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import CapturaDocumentoNota from "@/modules/compras/components/CapturaDocumentoNota";
import {
  DESTINOS_ITEM_COMPRA,
  contarItensSemDestino,
  rotuloDestinoItemCompra,
} from "@/modules/compras/domain/destinoItemCompra";
import {
  EntradaCompra,
  IdentificacaoItemCompra,
  OrigemSugestaoClassificacao,
} from "@/modules/compras/types/entradaCompra";
import { Fornecedor } from "@/modules/fornecedores/types/fornecedor";

interface ClassificacaoTela {
  destino: string;
  sugestao?: OrigemSugestaoClassificacao;
}

const ROTULO_SUGESTAO: Record<
  OrigemSugestaoClassificacao,
  string
> = {
  MEMORIA: "Destino das compras anteriores",
  PADRAO_FORNECEDOR: "Destino padrão do fornecedor",
};

// Peso real informado na entrada (regra 7.14), por item.
interface PesoRealTela {
  quantidade: string;
  unidade: string;
  lembrar: boolean;
  // Veio do fator lembrado do fornecedor e ainda não foi salvo.
  sugerido?: boolean;
}

function montarPesoReal(
  entrada: EntradaCompra,
  identificacoes: IdentificacaoItemCompra[] = [],
): Record<string, PesoRealTela> {
  const resultado: Record<string, PesoRealTela> = {};

  for (const item of entrada.itens) {
    const fator = identificacoes.find(
      (i) => i.itemId === item.id,
    )?.fator;

    if (
      item.quantidadeReal !== undefined &&
      item.unidadeReal
    ) {
      resultado[item.id] = {
        quantidade: String(item.quantidadeReal).replace(
          ".",
          ",",
        ),
        unidade: item.unidadeReal,
        lembrar: false,
      };
    } else if (fator) {
      resultado[item.id] = {
        quantidade: String(
          Math.round(item.quantidade * fator.quantidade * 10000) /
            10000,
        ).replace(".", ","),
        unidade: fator.unidade,
        lembrar: false,
        sugerido: true,
      };
    } else {
      resultado[item.id] = {
        quantidade: "",
        unidade: "",
        lembrar: false,
      };
    }
  }

  return resultado;
}

function montarClassificacao(
  entrada: EntradaCompra,
  identificacoes: IdentificacaoItemCompra[] = [],
): Record<string, ClassificacaoTela> {
  const resultado: Record<string, ClassificacaoTela> =
    {};

  for (const item of entrada.itens) {
    const identificacao = item.destino
      ? undefined
      : identificacoes.find(
          (i) => i.itemId === item.id,
        );

    resultado[item.id] =
      identificacao?.destinoSugerido
        ? {
            destino: identificacao.destinoSugerido,
            sugestao: identificacao.origem,
          }
        : {
            destino: item.destino ?? "",
          };
  }

  return resultado;
}

interface Props {
  params: Promise<{
    id: string;
  }>;
}

function formatarMoeda(valor: number): string {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarNumero(
  valor: number,
  casas = 3,
): string {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  });
}

function formatarData(valor?: string): string {
  if (!valor) {
    return "—";
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "—";
  }

  return data.toLocaleDateString("pt-BR");
}

function formatarDocumentoFornecedor(
  fornecedor: Fornecedor,
): string {
  if (fornecedor.cnpj) {
    const d = fornecedor.cnpj.replace(/\D/g, "");

    return d.length === 14
      ? `CNPJ ${d.replace(
          /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
          "$1.$2.$3/$4-$5",
        )}`
      : `CNPJ ${fornecedor.cnpj}`;
  }

  if (fornecedor.cpf) {
    const d = fornecedor.cpf.replace(/\D/g, "");

    return d.length === 11
      ? `CPF ${d.replace(
          /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
          "$1.$2.$3-$4",
        )}`
      : `CPF ${fornecedor.cpf}`;
  }

  return "Sem CNPJ ou CPF";
}

const ROTULO_TIPO_DOCUMENTO: Record<string, string> = {
  NOTA_FISCAL: "Nota fiscal",
  RECIBO: "Recibo",
  COMPROVANTE: "Comprovante",
  OUTRO: "Outro",
};

const ROTULO_STATUS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
};

const CLASSE_STATUS: Record<string, string> = {
  RASCUNHO: "bg-amber-100 text-amber-700",
  CONFIRMADA: "bg-emerald-100 text-emerald-700",
  CANCELADA: "bg-red-100 text-red-700",
};

const ROTULO_ORIGEM: Record<string, string> = {
  FOTOGRAFIA: "Fotografia",
  UPLOAD: "Arquivo enviado",
  XML: "XML",
  IMPORTACAO: "Importação",
};

export default function EntradaCompraPage({
  params,
}: Props) {
  const [entradaId, setEntradaId] = useState<string | null>(
    null,
  );

  const [entrada, setEntrada] =
    useState<EntradaCompra | null>(null);

  const [fornecedor, setFornecedor] =
    useState<Fornecedor | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(
    null,
  );

  const [confirmandoEntrada, setConfirmandoEntrada] =
    useState(false);
  const [cancelandoEntrada, setCancelandoEntrada] =
    useState(false);
  const [motivoCancelamento, setMotivoCancelamento] =
    useState("");

  const [identificacoes, setIdentificacoes] = useState<
    IdentificacaoItemCompra[]
  >([]);
  const [classificacao, setClassificacao] = useState<
    Record<string, ClassificacaoTela>
  >({});
  const [classificacaoAlterada, setClassificacaoAlterada] =
    useState(false);
  const [salvandoClassificacao, setSalvandoClassificacao] =
    useState(false);
  const [pesoReal, setPesoReal] = useState<
    Record<string, PesoRealTela>
  >({});

  function alterarPesoReal(
    itemId: string,
    parcial: Partial<PesoRealTela>,
  ) {
    setPesoReal((atual) => ({
      ...atual,
      [itemId]: {
        ...(atual[itemId] ?? {
          quantidade: "",
          unidade: "",
          lembrar: false,
        }),
        ...parcial,
        sugerido: false,
      },
    }));

    setClassificacaoAlterada(true);
    setMensagem(null);
  }

  useEffect(() => {
    let ativo = true;

    async function carregarEntrada() {
      try {
        setCarregando(true);
        setErro(null);

        const { id } = await params;

        if (!ativo) {
          return;
        }

        setEntradaId(id);

        const resposta = await fetch(
          `/api/compras/entradas?id=${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados?.sucesso) {
          throw new Error(
            dados?.mensagem ??
              "Não foi possível carregar a entrada de compra.",
          );
        }

        if (!dados.encontrada || !dados.entrada) {
          throw new Error(
            "Entrada de compra não encontrada.",
          );
        }

        if (!ativo) {
          return;
        }

        setEntrada(dados.entrada);

        const respostaFornecedor = await fetch(
          `/api/fornecedores?id=${encodeURIComponent(
            dados.entrada.fornecedorId,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const dadosFornecedor =
          await respostaFornecedor.json();

        if (
          ativo &&
          respostaFornecedor.ok &&
          dadosFornecedor?.sucesso &&
          dadosFornecedor.fornecedor
        ) {
          setFornecedor(dadosFornecedor.fornecedor);
        }

        // Identificação dos itens (regra 9.13): conhecido ou novo.
        const respostaIdentificacao = await fetch(
          `/api/compras/entradas/${encodeURIComponent(
            id,
          )}/itens/classificacao`,
          { cache: "no-store" },
        );

        const dadosIdentificacao =
          await respostaIdentificacao.json();

        if (!ativo) {
          return;
        }

        const identificadas: IdentificacaoItemCompra[] =
          respostaIdentificacao.ok &&
          dadosIdentificacao?.sucesso
            ? dadosIdentificacao.identificacoes ?? []
            : [];

        setIdentificacoes(identificadas);

        const classificacaoInicial = montarClassificacao(
          dados.entrada,
          identificadas,
        );

        setClassificacao(classificacaoInicial);

        const pesoInicial = montarPesoReal(
          dados.entrada,
          identificadas,
        );

        setPesoReal(pesoInicial);

        // Sugestões de rascunho ainda precisam ser salvas.
        setClassificacaoAlterada(
          dados.entrada.status === "RASCUNHO" &&
            (Object.values(classificacaoInicial).some(
              (c) => c.sugestao,
            ) ||
              Object.values(pesoInicial).some(
                (peso) => peso.sugerido,
              )),
        );
      } catch (error) {
        if (!ativo) {
          return;
        }

        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a entrada de compra.",
        );
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarEntrada();

    return () => {
      ativo = false;
    };
  }, [params]);

  async function adicionarFotografia(
    arquivo: File,
  ): Promise<boolean> {
    if (!entradaId) {
      setErro(
        "A entrada de compra ainda não foi identificada.",
      );

      return false;
    }

    try {
      setEnviando(true);
      setErro(null);
      setMensagem(null);

      const formData = new FormData();

      formData.append("arquivo", arquivo);
      formData.append("tipoDocumento", "NOTA_FISCAL");
      formData.append("origem", "FOTOGRAFIA");

      const resposta = await fetch(
        `/api/compras/entradas/${encodeURIComponent(
          entradaId,
        )}/documentos`,
        {
          method: "POST",
          body: formData,
        },
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados?.sucesso) {
        throw new Error(
          dados?.erro ??
            dados?.mensagem ??
            "Não foi possível adicionar a fotografia.",
        );
      }

      setMensagem(
        "Fotografia da nota adicionada com sucesso.",
      );

      setEntrada((atual) => {
        if (!atual || !dados.documento) {
          return atual;
        }

        return {
          ...atual,
          documentos: [
            ...atual.documentos,
            dados.documento,
          ],
        };
      });

      return true;
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar a fotografia da nota.",
      );

      return false;
    } finally {
      setEnviando(false);
    }
  }

  function alterarDestino(
    itemId: string,
    destino: string,
  ) {
    setClassificacao((atual) => ({
      ...atual,
      [itemId]: {
        destino,
        sugestao: undefined,
      },
    }));

    setClassificacaoAlterada(true);
    setMensagem(null);
  }

  async function salvarClassificacao(): Promise<void> {
    if (!entradaId || !entrada) {
      return;
    }

    try {
      setSalvandoClassificacao(true);
      setErro(null);
      setMensagem(null);

      const resposta = await fetch(
        `/api/compras/entradas/${encodeURIComponent(
          entradaId,
        )}/itens/classificacao`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            itens: entrada.itens.map((item) => {
              const destino =
                classificacao[item.id]?.destino || null;

              const peso = pesoReal[item.id];

              const usaPeso =
                (destino === "INSUMO" ||
                  destino === "EMBALAGEM") &&
                peso &&
                peso.quantidade.trim() !== "";

              return {
                itemId: item.id,
                destino,
                quantidadeReal: usaPeso
                  ? Number(
                      peso.quantidade.replace(",", "."),
                    )
                  : null,
                unidadeReal: usaPeso
                  ? peso.unidade.trim() || null
                  : null,
                lembrarFator: Boolean(
                  usaPeso && peso.lembrar,
                ),
              };
            }),
          }),
        },
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados?.sucesso) {
        throw new Error(
          dados?.mensagem ??
            "Não foi possível salvar a classificação.",
        );
      }

      setEntrada(dados.entrada);
      setClassificacao(
        montarClassificacao(dados.entrada),
      );
      setPesoReal(montarPesoReal(dados.entrada));
      setClassificacaoAlterada(false);
      setMensagem("Classificação salva.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a classificação.",
      );
    } finally {
      setSalvandoClassificacao(false);
    }
  }

  async function executarAcao(
    acao: "confirmar" | "cancelar",
  ): Promise<void> {
    if (!entradaId) {
      return;
    }

    if (
      acao === "cancelar" &&
      !motivoCancelamento.trim()
    ) {
      setErro("Informe o motivo do cancelamento.");

      return;
    }

    try {
      setProcessando(true);
      setErro(null);
      setMensagem(null);

      const resposta = await fetch(
        `/api/compras/entradas/${encodeURIComponent(
          entradaId,
        )}/${acao}`,
        {
          method: "POST",
          headers:
            acao === "cancelar"
              ? { "Content-Type": "application/json" }
              : undefined,
          body:
            acao === "cancelar"
              ? JSON.stringify({
                  motivo: motivoCancelamento.trim(),
                })
              : undefined,
        },
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados?.sucesso) {
        throw new Error(
          dados?.mensagem ??
            (acao === "confirmar"
              ? "Não foi possível confirmar a entrada."
              : "Não foi possível cancelar a entrada."),
        );
      }

      setEntrada((atual) =>
        dados.entrada
          ? {
              ...dados.entrada,
              documentos:
                dados.entrada.documentos ??
                atual?.documentos ??
                [],
            }
          : atual,
      );

      if (dados.entrada) {
        setClassificacao(
          montarClassificacao(dados.entrada),
        );
        setClassificacaoAlterada(false);
      }

      const avisosCusto: string[] =
        acao === "confirmar" &&
        Array.isArray(dados.entrada?.avisosCusto)
          ? dados.entrada.avisosCusto
          : [];

      setMensagem(
        acao === "confirmar"
          ? `Entrada confirmada com sucesso.${
              avisosCusto.length > 0
                ? ` Atenção ao custo: ${avisosCusto.join(" | ")}`
                : ""
            }`
          : "Entrada cancelada.",
      );

      setConfirmandoEntrada(false);
      setCancelandoEntrada(false);
      setMotivoCancelamento("");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a ação.",
      );
    } finally {
      setProcessando(false);
    }
  }

  if (carregando) {
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        Carregando entrada de compra...
      </div>
    );
  }

  if (erro && !entrada) {
    return (
      <div className="space-y-6">
        <Link
          href="/compras"
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Voltar para Compras
        </Link>

        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {erro}
        </div>
      </div>
    );
  }

  if (!entrada) {
    return null;
  }

  const ehRascunho = entrada.status === "RASCUNHO";
  const ehConfirmada = entrada.status === "CONFIRMADA";

  // Pendências pelo que está gravado (é o que o servidor confere).
  const semDestino = contarItensSemDestino(entrada.itens);

  const motivoBloqueioConfirmacao = classificacaoAlterada
    ? "Salve a classificação dos itens antes de confirmar."
    : semDestino > 0
      ? `Falta classificar o destino de ${semDestino} ${
          semDestino === 1 ? "item" : "itens"
        }.`
      : null;

  const identificacaoDoItem = (itemId: string) =>
    identificacoes.find((i) => i.itemId === itemId);

  const nomeFornecedor = fornecedor
    ? fornecedor.nomeFantasia?.trim() ||
      fornecedor.razaoSocial
    : "Fornecedor não encontrado";

  const tituloDocumento = entrada.numeroDocumento
    ? `${
        ROTULO_TIPO_DOCUMENTO[entrada.tipoDocumento] ??
        entrada.tipoDocumento
      } nº ${entrada.numeroDocumento}${
        entrada.serie ? ` · série ${entrada.serie}` : ""
      }`
    : ROTULO_TIPO_DOCUMENTO[entrada.tipoDocumento] ??
      entrada.tipoDocumento;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/compras"
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Voltar para Compras
        </Link>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Entrada de compra
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {nomeFornecedor}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {fornecedor &&
                `${formatarDocumentoFornecedor(fornecedor)} · `}
              {tituloDocumento}
            </p>
          </div>

          <span
            className={`inline-flex self-start rounded-full px-4 py-1.5 text-sm font-semibold ${
              CLASSE_STATUS[entrada.status] ??
              "bg-slate-100 text-slate-600"
            }`}
          >
            {ROTULO_STATUS[entrada.status] ??
              entrada.status}
          </span>
        </div>
      </div>

      {erro && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {erro}
        </div>
      )}

      {mensagem && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {mensagem}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Data do documento
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {formatarData(entrada.dataDocumento)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Data de entrada
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {formatarData(entrada.dataEntrada)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Itens</p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {entrada.itens.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Valor total
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {formatarMoeda(entrada.valorTotal)}
          </p>
        </div>
      </section>

      {entrada.chaveAcesso && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Chave de acesso
          </p>
          <p className="mt-1 break-all font-mono text-sm text-slate-800">
            {entrada.chaveAcesso.replace(
              /(\d{4})(?=\d)/g,
              "$1 ",
            )}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Itens
            </h2>

            {ehRascunho && (
              <p className="mt-1 text-sm text-slate-500">
                Escolha o destino de cada item. Itens já
                conhecidos deste fornecedor vêm preenchidos
                para conferência.
              </p>
            )}
          </div>

          {ehRascunho && entrada.itens.length > 0 && (
            <button
              type="button"
              onClick={salvarClassificacao}
              disabled={
                !classificacaoAlterada ||
                salvandoClassificacao ||
                processando
              }
              className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {salvandoClassificacao
                ? "Salvando..."
                : "Salvar classificação"}
            </button>
          )}
        </div>

        {entrada.itens.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            Nenhum item registrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 text-left">
                    Descrição
                  </th>
                  <th className="px-5 py-3 text-left">
                    Destino
                  </th>
                  <th className="px-5 py-3 text-right">
                    Quantidade
                  </th>
                  <th className="px-5 py-3 text-right">
                    Valor unitário
                  </th>
                  <th className="px-5 py-3 text-right">
                    Desconto
                  </th>
                  <th className="px-5 py-3 text-right">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {entrada.itens.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {item.descricaoOriginal}
                        </span>

                        {ehRascunho &&
                          identificacaoDoItem(item.id) && (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                identificacaoDoItem(item.id)
                                  ?.conhecido
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-sky-100 text-sky-700"
                              }`}
                            >
                              {identificacaoDoItem(item.id)
                                ?.conhecido
                                ? "Item já conhecido"
                                : "Item novo"}
                            </span>
                          )}
                      </div>
                      {(item.codigoFornecedor ||
                        item.lote ||
                        item.validade) && (
                        <div className="mt-0.5 text-xs text-slate-400">
                          {[
                            item.codigoFornecedor &&
                              `Cód. ${item.codigoFornecedor}`,
                            item.lote &&
                              `Lote ${item.lote}`,
                            item.validade &&
                              `Validade ${formatarData(
                                item.validade,
                              )}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </td>
                    <td className="min-w-56 px-5 py-3 align-top">
                      {ehRascunho ? (
                        <div className="space-y-1">
                          <select
                            aria-label={`Destino de ${item.descricaoOriginal}`}
                            value={
                              classificacao[item.id]
                                ?.destino ?? ""
                            }
                            onChange={(evento) =>
                              alterarDestino(
                                item.id,
                                evento.target.value,
                              )
                            }
                            disabled={
                              salvandoClassificacao ||
                              processando
                            }
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
                              classificacao[item.id]
                                ?.destino
                                ? "border-slate-300 bg-white"
                                : "border-amber-300 bg-amber-50"
                            }`}
                          >
                            <option value="">
                              Selecione o destino...
                            </option>
                            {DESTINOS_ITEM_COMPRA.map(
                              (destino) => (
                                <option
                                  key={destino.valor}
                                  value={destino.valor}
                                >
                                  {destino.rotulo}
                                </option>
                              ),
                            )}
                          </select>

                          {classificacao[item.id]
                            ?.sugestao && (
                            <p className="text-xs font-medium text-sky-700">
                              {
                                ROTULO_SUGESTAO[
                                  classificacao[item.id]
                                    ?.sugestao ?? "MEMORIA"
                                ]
                              }
                            </p>
                          )}
                          {(classificacao[item.id]?.destino ===
                            "INSUMO" ||
                            classificacao[item.id]?.destino ===
                              "EMBALAGEM") && (
                            <div className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
                              <p className="text-xs font-semibold text-slate-600">
                                Quantidade real (opcional)
                              </p>

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  aria-label={`Quantidade real de ${item.descricaoOriginal}`}
                                  value={
                                    pesoReal[item.id]
                                      ?.quantidade ?? ""
                                  }
                                  onChange={(evento) =>
                                    alterarPesoReal(item.id, {
                                      quantidade:
                                        evento.target.value,
                                    })
                                  }
                                  placeholder="Ex.: 6,8"
                                  disabled={
                                    salvandoClassificacao ||
                                    processando
                                  }
                                  className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
                                />

                                <input
                                  list={`unidades-${item.id}`}
                                  aria-label={`Unidade da quantidade real de ${item.descricaoOriginal}`}
                                  value={
                                    pesoReal[item.id]?.unidade ??
                                    ""
                                  }
                                  onChange={(evento) =>
                                    alterarPesoReal(item.id, {
                                      unidade:
                                        evento.target.value,
                                    })
                                  }
                                  placeholder="kg"
                                  disabled={
                                    salvandoClassificacao ||
                                    processando
                                  }
                                  className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
                                />

                                <datalist
                                  id={`unidades-${item.id}`}
                                >
                                  {["kg", "g", "L", "ml", "un"].map(
                                    (unidade) => (
                                      <option
                                        key={unidade}
                                        value={unidade}
                                      />
                                    ),
                                  )}
                                </datalist>
                              </div>

                              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={
                                    pesoReal[item.id]?.lembrar ??
                                    false
                                  }
                                  onChange={(evento) =>
                                    alterarPesoReal(item.id, {
                                      lembrar:
                                        evento.target.checked,
                                    })
                                  }
                                  className="cursor-pointer"
                                />
                                Lembrar como fixo para este item
                              </label>

                              {pesoReal[item.id]?.sugerido && (
                                <p className="text-xs font-medium text-sky-700">
                                  Fator lembrado das compras
                                  anteriores
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-slate-800">
                            {rotuloDestinoItemCompra(
                              item.destino,
                            )}
                          </span>

                          {item.quantidadeReal !== undefined &&
                            item.unidadeReal && (
                              <p className="mt-1 text-xs text-slate-500">
                                Quantidade real:{" "}
                                {formatarNumero(
                                  item.quantidadeReal,
                                )}{" "}
                                {item.unidadeReal}
                              </p>
                            )}
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatarNumero(item.quantidade)}{" "}
                      {item.unidade}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatarMoeda(item.valorUnitario)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {item.desconto > 0
                        ? formatarMoeda(item.desconto)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {formatarMoeda(item.valorTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <dl className="ml-auto grid max-w-sm grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-200 p-5 text-sm">
          <dt className="text-slate-500">Produtos</dt>
          <dd className="text-right text-slate-800">
            {formatarMoeda(entrada.valorProdutos)}
          </dd>

          <dt className="text-slate-500">Desconto</dt>
          <dd className="text-right text-slate-800">
            − {formatarMoeda(entrada.valorDesconto)}
          </dd>

          <dt className="text-slate-500">Frete</dt>
          <dd className="text-right text-slate-800">
            + {formatarMoeda(entrada.valorFrete)}
          </dd>

          <dt className="font-semibold text-slate-900">
            Total
          </dt>
          <dd className="text-right font-bold text-slate-900">
            {formatarMoeda(entrada.valorTotal)}
          </dd>
        </dl>
      </section>

      {entrada.observacao && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Observações
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-800">
            {entrada.observacao}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Documentos anexados
        </h2>

        {entrada.documentos.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Nenhum documento anexado a esta entrada.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {entrada.documentos.map((documento) => (
              <li
                key={documento.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {documento.nomeArquivo}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {ROTULO_TIPO_DOCUMENTO[
                      documento.tipoDocumento
                    ] ?? documento.tipoDocumento}{" "}
                    ·{" "}
                    {ROTULO_ORIGEM[documento.origem] ??
                      documento.origem}
                  </p>
                </div>

                <a
                  href={`/api/compras/entradas/${encodeURIComponent(
                    entrada.id,
                  )}/documentos/${encodeURIComponent(
                    documento.id,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="self-start rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:self-auto"
                >
                  Abrir
                </a>
              </li>
            ))}
          </ul>
        )}

        {ehRascunho && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="mb-4 text-sm text-slate-500">
              Adicione a fotografia da nota desta entrada.
            </p>

            <CapturaDocumentoNota
              onConfirmar={adicionarFotografia}
              disabled={enviando || processando}
            />

            {enviando && (
              <p className="mt-4 text-sm font-semibold text-slate-700">
                Salvando fotografia...
              </p>
            )}
          </div>
        )}
      </section>

      {(ehRascunho || ehConfirmada) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {ehRascunho && !confirmandoEntrada && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <p className="text-slate-500">
                  Confira fornecedor, itens e valores antes
                  de confirmar. Depois de confirmada, a
                  entrada não pode mais ser alterada.
                </p>

                {motivoBloqueioConfirmacao && (
                  <p className="mt-2 font-semibold text-amber-700">
                    {motivoBloqueioConfirmacao}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setConfirmandoEntrada(true)}
                disabled={
                  processando ||
                  enviando ||
                  motivoBloqueioConfirmacao !== null
                }
                className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Confirmar entrada
              </button>
            </div>
          )}

          {ehRascunho && confirmandoEntrada && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-900">
                Confirmar a entrada de{" "}
                {formatarMoeda(entrada.valorTotal)} de{" "}
                {nomeFornecedor}?
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmandoEntrada(false)}
                  disabled={processando}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={() => executarAcao("confirmar")}
                  disabled={processando}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {processando
                    ? "Confirmando..."
                    : "Sim, confirmar"}
                </button>
              </div>
            </div>
          )}

          {ehConfirmada && !cancelandoEntrada && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Esta entrada está confirmada. Se ela foi
                registrada por engano, cancele informando o
                motivo.
              </p>

              <button
                type="button"
                onClick={() => setCancelandoEntrada(true)}
                disabled={processando}
                className="shrink-0 rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Cancelar entrada
              </button>
            </div>
          )}

          {ehConfirmada && cancelandoEntrada && (
            <div className="space-y-4">
              <label
                htmlFor="motivoCancelamento"
                className="block text-sm font-semibold text-slate-900"
              >
                Motivo do cancelamento
              </label>

              <textarea
                id="motivoCancelamento"
                value={motivoCancelamento}
                onChange={(evento) =>
                  setMotivoCancelamento(
                    evento.target.value,
                  )
                }
                rows={3}
                disabled={processando}
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Ex.: nota lançada em duplicidade"
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCancelandoEntrada(false);
                    setMotivoCancelamento("");
                  }}
                  disabled={processando}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={() => executarAcao("cancelar")}
                  disabled={
                    processando ||
                    !motivoCancelamento.trim()
                  }
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {processando
                    ? "Cancelando..."
                    : "Cancelar entrada"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
