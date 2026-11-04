"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import CapturaDocumentoNota from "@/modules/compras/components/CapturaDocumentoNota";
import { EntradaCompra } from "@/modules/compras/types/entradaCompra";
import { Fornecedor } from "@/modules/fornecedores/types/fornecedor";

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

      setMensagem(
        acao === "confirmar"
          ? "Entrada confirmada com sucesso."
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
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900">
            Itens
          </h2>
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
                      <div className="font-medium text-slate-900">
                        {item.descricaoOriginal}
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
              <p className="text-sm text-slate-500">
                Confira fornecedor, itens e valores antes de
                confirmar. Depois de confirmada, a entrada
                não pode mais ser alterada.
              </p>

              <button
                type="button"
                onClick={() => setConfirmandoEntrada(true)}
                disabled={processando || enviando}
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
