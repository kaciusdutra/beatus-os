"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import CapturaDocumentoNota from "@/modules/compras/components/CapturaDocumentoNota";
import {
  interpretarQrNfce,
  type InterpretacaoQrNfce,
} from "@/modules/compras/services/documentos/interpretarQrNfce";
import { Fornecedor } from "@/modules/fornecedores/types/fornecedor";
import { cnpjValido } from "@/modules/fornecedores/domain/documentoFornecedor";

type TipoDocumento =
  | "NOTA_FISCAL"
  | "RECIBO"
  | "COMPROVANTE"
  | "OUTRO";

type ModoNovaEntrada =
  | "CAPTURA"
  | "MANUAL";

interface ItemFormulario {
  id: string;
  descricaoOriginal: string;
  codigoFornecedor: string;
  quantidade: string;
  unidade: string;
  valorUnitario: string;
  desconto: string;
}

interface FormularioEntrada {
  fornecedorId: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  serie: string;
  chaveAcesso: string;
  dataDocumento: string;
  dataEntrada: string;
  desconto: string;
  frete: string;
  observacao: string;
}

const formularioInicial: FormularioEntrada = {
  fornecedorId: "",
  tipoDocumento: "NOTA_FISCAL",
  numeroDocumento: "",
  serie: "",
  chaveAcesso: "",
  dataDocumento: "",
  dataEntrada: "",
  desconto: "0",
  frete: "0",
  observacao: "",
};

function criarItem(
  id = "item-inicial"
): ItemFormulario {
  return {
    id,
    descricaoOriginal: "",
    codigoFornecedor: "",
    quantidade: "1",
    unidade: "",
    valorUnitario: "0",
    desconto: "0",
  };
}

function formatarMoeda(
  valor: number
): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/*
 * Formata a data no horário LOCAL do computador
 * (AAAA-MM-DDTHH:MM), que é o formato do campo
 * datetime-local.
 *
 * Não usar toISOString() aqui: ele devolve o
 * horário UTC (em Manaus, 4 horas à frente).
 */
function formatarDataHoraLocal(
  data: Date
): string {
  const doisDigitos = (
    valor: number
  ) =>
    String(valor).padStart(2, "0");

  return [
    data.getFullYear(),
    "-",
    doisDigitos(
      data.getMonth() + 1
    ),
    "-",
    doisDigitos(data.getDate()),
    "T",
    doisDigitos(data.getHours()),
    ":",
    doisDigitos(
      data.getMinutes()
    ),
  ].join("");
}

function formatarDataParaApi(
  valor: string
): string | undefined {
  if (!valor) {
    return undefined;
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return undefined;
  }

  return data.toISOString();
}

function somenteDigitos(
  valor: string | undefined
): string {
  return (valor ?? "").replace(
    /\D/g,
    ""
  );
}

/*
 * Procura, entre os fornecedores ativos, o que tem
 * o mesmo CNPJ (ou CPF) do emitente da NFC-e.
 *
 * A chave traz sempre 14 dígitos; para emitente
 * pessoa física, o CPF vem com zeros à esquerda.
 */
function encontrarFornecedorPorDocumento(
  fornecedores: Fornecedor[],
  documentoEmitente: string
): Fornecedor | undefined {
  const documento =
    somenteDigitos(
      documentoEmitente
    );

  if (!documento) {
    return undefined;
  }

  return fornecedores.find(
    (fornecedor) => {
      const cnpj =
        somenteDigitos(
          fornecedor.cnpj
        );

      if (
        cnpj &&
        cnpj.padStart(14, "0") ===
          documento
      ) {
        return true;
      }

      const cpf =
        somenteDigitos(
          fornecedor.cpf
        );

      return (
        !!cpf &&
        cpf.padStart(14, "0") ===
          documento
      );
    }
  );
}

function formatarCnpj(
  documento: string
): string {
  const digitos =
    somenteDigitos(documento);

  if (digitos.length !== 14) {
    return documento;
  }

  return digitos.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function formatarTamanhoArquivo(
  tamanho: number
): string {
  return `${(
    tamanho /
    1024 /
    1024
  ).toFixed(2)} MB`;
}

export default function NovaEntradaCompraPage() {
  const router = useRouter();

  const [
    modoNovaEntrada,
    setModoNovaEntrada,
  ] = useState<ModoNovaEntrada>(
    "CAPTURA"
  );

  const [
    fornecedores,
    setFornecedores,
  ] = useState<Fornecedor[]>([]);

  const [
    formulario,
    setFormulario,
  ] = useState<FormularioEntrada>(
    formularioInicial
  );

  const ehNotaFiscal =
    formulario.tipoDocumento ===
    "NOTA_FISCAL";

  const [
    itens,
    setItens,
  ] = useState<ItemFormulario[]>([
    criarItem(),
  ]);

  const [
    arquivoDocumento,
    setArquivoDocumento,
  ] = useState<File | null>(null);

  const [
    qrConteudo,
    setQrConteudo,
  ] = useState<string | null>(null);

  const [
    interpretacaoQr,
    setInterpretacaoQr,
  ] =
    useState<InterpretacaoQrNfce | null>(
      null
    );

  const [
    fornecedorDoQr,
    setFornecedorDoQr,
  ] = useState<Fornecedor | null>(
    null
  );

  const [
    carregandoFornecedores,
    setCarregandoFornecedores,
  ] = useState(true);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    erro,
    setErro,
  ] = useState("");

  useEffect(() => {
    setFormulario((anterior) => ({
      ...anterior,
      dataEntrada:
        formatarDataHoraLocal(
          new Date()
        ),
    }));
  }, []);

  // Recarrega os fornecedores depois de um cadastro feito em outra aba
  // e, se veio de um QR, seleciona o fornecedor que acabou de ser cadastrado.
  async function atualizarListaFornecedores() {
    try {
      setCarregandoFornecedores(true);
      setErro("");

      const resposta = await fetch(
        "/api/fornecedores",
        { cache: "no-store" }
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados?.sucesso) {
        throw new Error(
          dados?.mensagem ??
            "Não foi possível carregar os fornecedores."
        );
      }

      const ativos: Fornecedor[] = (
        dados.fornecedores ?? []
      ).filter(
        (fornecedor: Fornecedor) =>
          fornecedor.ativo
      );

      setFornecedores(ativos);

      const documentoQr =
        interpretacaoQr?.ehNfce
          ? interpretacaoQr.dadosChave
              ?.documentoEmitente
          : undefined;

      if (documentoQr && !fornecedorDoQr) {
        const encontrado =
          encontrarFornecedorPorDocumento(
            ativos,
            documentoQr
          );

        if (encontrado) {
          setFornecedorDoQr(encontrado);

          setFormulario((anterior) => ({
            ...anterior,
            fornecedorId:
              anterior.fornecedorId ||
              encontrado.id,
          }));
        }
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar os fornecedores."
      );
    } finally {
      setCarregandoFornecedores(false);
    }
  }

  useEffect(() => {
    async function carregarFornecedores() {
      try {
        setCarregandoFornecedores(true);
        setErro("");

        const resposta =
          await fetch(
            "/api/fornecedores",
            {
              cache: "no-store",
            }
          );

        const dados =
          await resposta.json();

        if (
          !resposta.ok ||
          !dados?.sucesso
        ) {
          throw new Error(
            dados?.mensagem ??
              "Não foi possível carregar os fornecedores."
          );
        }

        setFornecedores(
          (
            dados.fornecedores ??
            []
          ).filter(
            (
              fornecedor: Fornecedor
            ) =>
              fornecedor.ativo
          )
        );
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao carregar os fornecedores."
        );
      } finally {
        setCarregandoFornecedores(
          false
        );
      }
    }

    void carregarFornecedores();
  }, []);

  const totais =
    useMemo(() => {
      const valorProdutos =
        itens.reduce(
          (
            total,
            item
          ) => {
            const quantidade =
              Number(
                item.quantidade
              );

            const valorUnitario =
              Number(
                item.valorUnitario
              );

            const desconto =
              Number(
                item.desconto
              );

            if (
              !Number.isFinite(
                quantidade
              ) ||
              !Number.isFinite(
                valorUnitario
              ) ||
              !Number.isFinite(
                desconto
              )
            ) {
              return total;
            }

            return (
              total +
              quantidade *
                valorUnitario -
              desconto
            );
          },
          0
        );

      const descontoEntrada =
        Number(
          formulario.desconto
        ) || 0;

      const frete =
        Number(
          formulario.frete
        ) || 0;

      const valorTotal =
        valorProdutos -
        descontoEntrada +
        frete;

      return {
        valorProdutos,
        descontoEntrada,
        frete,
        valorTotal,
      };
    }, [
      formulario.desconto,
      formulario.frete,
      itens,
    ]);

  function alterarFormulario(
    campo: keyof FormularioEntrada,
    valor: string
  ) {
    setFormulario(
      (anterior) => {
        const atualizado = {
          ...anterior,
          [campo]: valor,
        };

        // Série e chave de acesso só existem em nota fiscal.
        if (
          campo === "tipoDocumento" &&
          valor !== "NOTA_FISCAL"
        ) {
          atualizado.serie = "";
          atualizado.chaveAcesso = "";
        }

        return atualizado;
      }
    );
  }

  function alterarItem(
    itemId: string,
    campo: keyof ItemFormulario,
    valor: string
  ) {
    setItens(
      (anteriores) =>
        anteriores.map(
          (item) =>
            item.id === itemId
              ? {
                  ...item,
                  [campo]: valor,
                }
              : item
        )
    );
  }

  function adicionarItem() {
    setItens(
      (anteriores) => [
        ...anteriores,
        criarItem(
          `item-${Date.now()}`
        ),
      ]
    );
  }

  function removerItem(
    itemId: string
  ) {
    setItens(
      (anteriores) => {
        if (
          anteriores.length <= 1
        ) {
          return anteriores;
        }

        return anteriores.filter(
          (item) =>
            item.id !== itemId
        );
      }
    );
  }

  function iniciarDigitacaoManual() {
    setErro("");

    setModoNovaEntrada(
      "MANUAL"
    );
  }

  function voltarParaCaptura() {
    if (salvando) {
      return;
    }

    setErro("");

    setModoNovaEntrada(
      "CAPTURA"
    );
  }

  async function receberFotografia(
    arquivo: File
  ): Promise<boolean> {
    setArquivoDocumento(arquivo);
    setErro("");

    /*
     * Nesta etapa a fotografia original fica
     * temporariamente no fluxo da nova entrada.
     *
     * O processamento e a persistência ocorrerão
     * depois que os dados da entrada forem
     * conferidos e o RASCUNHO receber seu ID.
     */
    setModoNovaEntrada(
      "MANUAL"
    );

    return true;
  }

  async function receberQrCode(
    conteudo: string
  ): Promise<boolean> {
    setQrConteudo(conteudo);
    setErro("");

    /*
     * Interpreta o QR da NFC-e e preenche os
     * dados que a chave de acesso já carrega.
     *
     * Os itens da nota NÃO vêm no QR: eles
     * continuam sendo conferidos e digitados.
     * Se o QR não for de NFC-e, o conteúdo
     * bruto fica visível e o fluxo segue
     * manual, como antes.
     */
    const interpretacao =
      interpretarQrNfce(conteudo);

    setInterpretacaoQr(
      interpretacao
    );

    const dadosChave =
      interpretacao.dadosChave;

    if (
      interpretacao.ehNfce &&
      interpretacao.chaveAcesso &&
      dadosChave
    ) {
      const fornecedor =
        encontrarFornecedorPorDocumento(
          fornecedores,
          dadosChave.documentoEmitente
        );

      setFornecedorDoQr(
        fornecedor ?? null
      );

      const chaveAcesso =
        interpretacao.chaveAcesso;

      setFormulario(
        (anterior) => ({
          ...anterior,
          tipoDocumento:
            "NOTA_FISCAL",
          chaveAcesso,
          serie: dadosChave.serie,
          numeroDocumento:
            dadosChave.numero,
          fornecedorId:
            anterior.fornecedorId ||
            fornecedor?.id ||
            "",
        })
      );
    } else {
      setFornecedorDoQr(null);
    }

    setModoNovaEntrada(
      "MANUAL"
    );

    return true;
  }

  function limparCapturaDocumento() {
    setArquivoDocumento(null);
    setQrConteudo(null);
    setInterpretacaoQr(null);
    setFornecedorDoQr(null);
    setErro("");
    setModoNovaEntrada(
      "CAPTURA"
    );
  }

  async function salvarEntrada(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    try {
      setSalvando(true);
      setErro("");

      if (
        !formulario.fornecedorId
      ) {
        throw new Error(
          "Selecione o fornecedor."
        );
      }

      if (itens.length === 0) {
        throw new Error(
          "Adicione pelo menos um item."
        );
      }

      if (
        qrConteudo &&
        !arquivoDocumento
      ) {
        /*
         * O QR já foi capturado, mas ainda não
         * existe interpretador fiscal conectado.
         *
         * Abaixo o usuário pode optar explicitamente
         * por ignorar o QR e continuar digitando.
         */
      }

      const itensPreparados =
        itens.map(
          (item) => {
            const quantidade =
              Number(
                item.quantidade
              );

            const valorUnitario =
              Number(
                item.valorUnitario
              );

            const desconto =
              Number(
                item.desconto
              );

            if (
              !item.descricaoOriginal.trim()
            ) {
              throw new Error(
                "Informe a descrição de todos os itens."
              );
            }

            if (
              !item.unidade.trim()
            ) {
              throw new Error(
                "Informe a unidade de todos os itens."
              );
            }

            if (
              !Number.isFinite(
                quantidade
              ) ||
              quantidade <= 0
            ) {
              throw new Error(
                "A quantidade dos itens deve ser maior que zero."
              );
            }

            if (
              !Number.isFinite(
                valorUnitario
              ) ||
              valorUnitario < 0
            ) {
              throw new Error(
                "O valor unitário dos itens é inválido."
              );
            }

            if (
              !Number.isFinite(
                desconto
              ) ||
              desconto < 0
            ) {
              throw new Error(
                "O desconto dos itens é inválido."
              );
            }

            const valorTotal =
              quantidade *
                valorUnitario -
              desconto;

            if (
              valorTotal < 0
            ) {
              throw new Error(
                "O desconto de um item não pode ser maior que seu valor bruto."
              );
            }

            return {
              descricaoOriginal:
                item.descricaoOriginal.trim(),

              codigoFornecedor:
                item.codigoFornecedor.trim() ||
                undefined,

              quantidade,

              unidade:
                item.unidade.trim(),

              valorUnitario,

              desconto,

              valorTotal:
                Number(
                  valorTotal.toFixed(
                    2
                  )
                ),
            };
          }
        );

      const resposta =
        await fetch(
          "/api/compras/entradas",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json; charset=utf-8",
            },
            body: JSON.stringify({
              fornecedorId:
                formulario.fornecedorId,

              tipoDocumento:
                formulario.tipoDocumento,

              numeroDocumento:
                formulario.numeroDocumento.trim() ||
                undefined,

              serie:
                ehNotaFiscal
                  ? formulario.serie.trim() ||
                    undefined
                  : undefined,

              chaveAcesso:
                ehNotaFiscal
                  ? formulario.chaveAcesso.trim() ||
                    undefined
                  : undefined,

              dataDocumento:
                formatarDataParaApi(
                  formulario.dataDocumento
                ),

              dataEntrada:
                formatarDataParaApi(
                  formulario.dataEntrada
                ),

              valorProdutos:
                Number(
                  totais.valorProdutos.toFixed(
                    2
                  )
                ),

              valorDesconto:
                Number(
                  totais.descontoEntrada.toFixed(
                    2
                  )
                ),

              valorFrete:
                Number(
                  totais.frete.toFixed(
                    2
                  )
                ),

              valorTotal:
                Number(
                  totais.valorTotal.toFixed(
                    2
                  )
                ),

              observacao:
                formulario.observacao.trim() ||
                undefined,

              itens:
                itensPreparados,
            }),
          }
        );

      const dados =
        await resposta.json();

      if (
        !resposta.ok ||
        !dados?.sucesso
      ) {
        throw new Error(
          dados?.mensagem ??
            "Não foi possível criar a entrada de compra."
        );
      }

      const entradaId =
        dados.entrada?.id;

      if (!entradaId) {
        throw new Error(
          "A entrada foi criada, mas seu ID não foi retornado."
        );
      }

      /*
       * Depois que a entrada recebeu seu ID,
       * podemos persistir o documento original.
       *
       * O arquivo original não é alterado.
       */
      if (arquivoDocumento) {
        const formData =
          new FormData();

        formData.append(
          "arquivo",
          arquivoDocumento
        );

        formData.append(
          "tipoDocumento",
          formulario.tipoDocumento
        );

        formData.append(
          "origem",
          "FOTOGRAFIA"
        );

        const respostaDocumento =
          await fetch(
            `/api/compras/entradas/${encodeURIComponent(
              entradaId
            )}/documentos`,
            {
              method: "POST",
              body: formData,
            }
          );

        const dadosDocumento =
          await respostaDocumento.json();

        if (
          !respostaDocumento.ok ||
          !dadosDocumento?.sucesso
        ) {
          setErro(
            dadosDocumento?.erro ??
              dadosDocumento?.mensagem ??
              "A entrada foi criada, mas o documento original não pôde ser anexado."
          );

          return;
        }
      }

      // Depois de salvar, volta para a tela inicial do módulo.
      router.push("/compras");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a entrada de compra."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Compras
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Nova entrada de compra
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Primeiro capture o documento. Depois
          confira os dados e complete manualmente
          o que ainda não puder ser extraído.
        </p>
      </div>

      {erro && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {erro}
        </div>
      )}

      {modoNovaEntrada ===
        "CAPTURA" && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Documento de origem
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Nós tentaremos primeiro identificar o
                documento pelo QR Code. Se não for
                possível utilizar o QR, fotografe ou
                selecione uma imagem da nota.
              </p>
            </div>

            <CapturaDocumentoNota
              onConfirmar={
                receberFotografia
              }
              onQrCodeConfirmado={
                receberQrCode
              }
              disabled={salvando}
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Digitação manual
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Use esta opção quando não houver
                  documento digitalizado ou quando
                  a leitura automática não for
                  suficiente.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  iniciarDigitacaoManual
                }
                className="cursor-pointer rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ✍️ Digitar manualmente
              </button>
            </div>
          </section>
        </>
      )}

      {modoNovaEntrada ===
        "MANUAL" && (
        <form
          onSubmit={salvarEntrada}
          className="space-y-6"
        >
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Documento de origem
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Os dados abaixo serão conferidos
                  antes da criação do rascunho.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  voltarParaCaptura
                }
                disabled={salvando}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                ← Voltar para captura
              </button>
            </div>

            <div className="space-y-4 p-6">
              {arquivoDocumento && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-800">
                    Documento original capturado
                  </p>

                  <p className="mt-1 text-sm text-emerald-700">
                    {arquivoDocumento.name}
                    {" · "}
                    {formatarTamanhoArquivo(
                      arquivoDocumento.size
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={
                      limparCapturaDocumento
                    }
                    disabled={salvando}
                    className="mt-3 text-sm font-semibold text-emerald-800 underline underline-offset-2"
                  >
                    Trocar documento
                  </button>
                </div>
              )}

              {qrConteudo && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-800">
                    QR Code capturado
                  </p>

                  <p className="mt-1 text-xs leading-5 break-all font-mono text-blue-700">
                    {qrConteudo}
                  </p>

                  {interpretacaoQr?.ehNfce &&
                    interpretacaoQr.dadosChave && (
                      <div className="mt-3 space-y-1 text-xs text-blue-800">
                        <p className="font-semibold">
                          ✓ NFC-e reconhecida
                          {interpretacaoQr.ambiente ===
                            "HOMOLOGACAO" &&
                            " (ambiente de HOMOLOGAÇÃO — nota sem valor fiscal)"}
                        </p>

                        <p>
                          Série{" "}
                          {
                            interpretacaoQr
                              .dadosChave.serie
                          }
                          {" · "}Número{" "}
                          {
                            interpretacaoQr
                              .dadosChave.numero
                          }
                          {" · "}Emissão{" "}
                          {interpretacaoQr.diaEmissao
                            ? `dia ${interpretacaoQr.diaEmissao} de `
                            : ""}
                          {
                            interpretacaoQr
                              .dadosChave
                              .anoMesEmissao
                          }
                        </p>

                        {interpretacaoQr.valorTotal !==
                          undefined && (
                          <p>
                            Valor total da nota:{" "}
                            {formatarMoeda(
                              interpretacaoQr.valorTotal
                            )}
                          </p>
                        )}

                        {fornecedorDoQr ? (
                          <p>
                            Fornecedor encontrado:{" "}
                            <strong>
                              {fornecedorDoQr.nomeFantasia ||
                                fornecedorDoQr.razaoSocial}
                            </strong>
                          </p>
                        ) : (
                          <p className="font-semibold text-amber-700">
                            CNPJ do emitente{" "}
                            {formatarCnpj(
                              interpretacaoQr
                                .dadosChave
                                .documentoEmitente
                            )}{" "}
                            não está cadastrado.
                            Cadastre o fornecedor ou
                            selecione manualmente.{" "}
                            <a
                              href={
                                cnpjValido(
                                  interpretacaoQr
                                    .dadosChave
                                    .documentoEmitente
                                )
                                  ? `/compras/fornecedores?cnpj=${interpretacaoQr.dadosChave.documentoEmitente}`
                                  : "/compras/fornecedores"
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline underline-offset-2 hover:text-amber-900"
                            >
                              Cadastrar este fornecedor
                            </a>
                          </p>
                        )}

                        <p className="text-blue-700">
                          Chave, série e número já
                          foram preenchidos. Os itens
                          da nota não vêm no QR Code:
                          confira e digite abaixo.
                        </p>
                      </div>
                    )}

                  {interpretacaoQr &&
                    !interpretacaoQr.ehNfce && (
                      <p className="mt-3 text-xs font-semibold text-amber-700">
                        QR Code não reconhecido como
                        NFC-e:{" "}
                        {interpretacaoQr.motivo}
                        {" "}Confira os dados
                        manualmente.
                      </p>
                    )}

                  <button
                    type="button"
                    onClick={() => {
                      setQrConteudo(
                        null
                      );
                      setInterpretacaoQr(
                        null
                      );
                      setFornecedorDoQr(
                        null
                      );
                    }}
                    disabled={salvando}
                    className="mt-3 text-sm font-semibold text-blue-800 underline underline-offset-2"
                  >
                    Ignorar este QR e continuar manualmente
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Dados da entrada
              </h2>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Fornecedor *
                  </label>

                  <div className="flex items-center gap-4 text-sm font-semibold">
                    <a
                      href="/compras/fornecedores"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600 hover:text-slate-900"
                    >
                      + Cadastrar fornecedor
                    </a>

                    <button
                      type="button"
                      onClick={() =>
                        void atualizarListaFornecedores()
                      }
                      disabled={
                        carregandoFornecedores ||
                        salvando
                      }
                      className="cursor-pointer text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ↻ Atualizar lista
                    </button>
                  </div>
                </div>

                <select
                  value={
                    formulario.fornecedorId
                  }
                  onChange={(
                    evento
                  ) =>
                    alterarFormulario(
                      "fornecedorId",
                      evento.target.value
                    )
                  }
                  disabled={
                    carregandoFornecedores ||
                    salvando
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">
                    {carregandoFornecedores
                      ? "Carregando fornecedores..."
                      : "Selecione o fornecedor..."}
                  </option>

                  {fornecedores.map(
                    (
                      fornecedor
                    ) => (
                      <option
                        key={
                          fornecedor.id
                        }
                        value={
                          fornecedor.id
                        }
                      >
                        {fornecedor.nomeFantasia
                          ? `${fornecedor.nomeFantasia} — ${fornecedor.razaoSocial}`
                          : fornecedor.razaoSocial}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Tipo de documento *
                </label>

                <select
                  value={
                    formulario.tipoDocumento
                  }
                  onChange={(
                    evento
                  ) =>
                    alterarFormulario(
                      "tipoDocumento",
                      evento.target.value as TipoDocumento
                    )
                  }
                  disabled={
                    salvando
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="NOTA_FISCAL">
                    Nota fiscal
                  </option>
                  <option value="RECIBO">
                    Recibo
                  </option>
                  <option value="COMPROVANTE">
                    Comprovante
                  </option>
                  <option value="OUTRO">
                    Outro
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Número do documento
                </label>

                <input
                  value={
                    formulario.numeroDocumento
                  }
                  onChange={(
                    evento
                  ) =>
                    alterarFormulario(
                      "numeroDocumento",
                      evento.target.value
                    )
                  }
                  disabled={
                    salvando
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Série
                </label>

                <input
                  value={
                    formulario.serie
                  }
                  onChange={(
                    evento
                  ) =>
                    alterarFormulario(
                      "serie",
                      evento.target.value
                    )
                  }
                  disabled={
                    salvando ||
                    !ehNotaFiscal
                  }
                  placeholder={
                    ehNotaFiscal
                      ? undefined
                      : "Só para nota fiscal"
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Data do documento
                </label>

                <input
                  type="datetime-local"
                  value={
                    formulario.dataDocumento
                  }
                  onChange={(
                    evento
                  ) =>
                    alterarFormulario(
                      "dataDocumento",
                      evento.target.value
                    )
                  }
                  disabled={
                    salvando
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Data de entrada
                </label>

                <input
                  type="datetime-local"
                  value={
                    formulario.dataEntrada
                  }
                  onChange={(
                    evento
                  ) =>
                    alterarFormulario(
                      "dataEntrada",
                      evento.target.value
                    )
                  }
                  disabled={
                    salvando
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Chave de acesso
                </label>

                <input
                  value={
                    formulario.chaveAcesso
                  }
                  onChange={(
                    evento
                  ) =>
                    alterarFormulario(
                      "chaveAcesso",
                      evento.target.value
                    )
                  }
                  maxLength={44}
                  disabled={
                    salvando ||
                    !ehNotaFiscal
                  }
                  placeholder={
                    ehNotaFiscal
                      ? "44 dígitos"
                      : "Só para nota fiscal"
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-mono outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Itens da compra
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Registre os itens exatamente como
                  aparecem no documento.
                </p>
              </div>
            </div>

            <div className="space-y-5 p-6">
              {itens.map(
                (
                  item,
                  indice
                ) => (
                  <div
                    key={
                      item.id
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">
                        Item{" "}
                        {indice +
                          1}
                      </h3>

                      {itens.length >
                        1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removerItem(
                              item.id
                            )
                          }
                          disabled={
                            salvando
                          }
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="md:col-span-2 xl:col-span-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Descrição original *
                        </label>

                        <input
                          value={
                            item.descricaoOriginal
                          }
                          onChange={(
                            evento
                          ) =>
                            alterarItem(
                              item.id,
                              "descricaoOriginal",
                              evento.target.value
                            )
                          }
                          disabled={
                            salvando
                          }
                          placeholder="Ex.: Peito bovino resfriado"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Código do produto na nota
                        </label>

                        <input
                          value={
                            item.codigoFornecedor
                          }
                          onChange={(
                            evento
                          ) =>
                            alterarItem(
                              item.id,
                              "codigoFornecedor",
                              evento.target.value
                            )
                          }
                          disabled={
                            salvando
                          }
                          placeholder="Opcional"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Quantidade *
                        </label>

                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={
                            item.quantidade
                          }
                          onChange={(
                            evento
                          ) =>
                            alterarItem(
                              item.id,
                              "quantidade",
                              evento.target.value
                            )
                          }
                          disabled={
                            salvando
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Unidade *
                        </label>

                        <input
                          value={
                            item.unidade
                          }
                          onChange={(
                            evento
                          ) =>
                            alterarItem(
                              item.id,
                              "unidade",
                              evento.target.value
                            )
                          }
                          disabled={
                            salvando
                          }
                          placeholder="kg, un, cx..."
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Valor unitário *
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.valorUnitario
                          }
                          onChange={(
                            evento
                          ) =>
                            alterarItem(
                              item.id,
                              "valorUnitario",
                              evento.target.value
                            )
                          }
                          disabled={
                            salvando
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Desconto do item
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.desconto
                          }
                          onChange={(
                            evento
                          ) =>
                            alterarItem(
                              item.id,
                              "desconto",
                              evento.target.value
                            )
                          }
                          disabled={
                            salvando
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      <div className="rounded-xl bg-white p-4 md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Total do item
                        </p>

                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {formatarMoeda(
                            Math.max(
                              0,
                              Number(
                                item.quantidade
                              ) *
                                Number(
                                  item.valorUnitario
                                ) -
                                Number(
                                  item.desconto
                                )
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* O botão fica sempre abaixo do último item. */}
              <button
                type="button"
                onClick={
                  adicionarItem
                }
                disabled={
                  salvando
                }
                className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-500 hover:bg-slate-50 disabled:opacity-60"
              >
                + Adicionar item
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Totais da entrada
              </h2>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Desconto da entrada
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    formulario.desconto
                  }
                  onChange={(
                    evento
                  ) =>
                    alterarFormulario(
                      "desconto",
                      evento.target.value
                    )
                  }
                  disabled={
                    salvando
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Frete
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    formulario.frete
                  }
                  onChange={(
                    evento
                  ) =>
                    alterarFormulario(
                      "frete",
                      evento.target.value
                    )
                  }
                  disabled={
                    salvando
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="rounded-2xl bg-slate-900 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Total da entrada
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatarMoeda(
                    totais.valorTotal
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-300">
                  Produtos:{" "}
                  {formatarMoeda(
                    totais.valorProdutos
                  )}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Observação
              </label>

              <textarea
                rows={3}
                value={
                  formulario.observacao
                }
                onChange={(
                  evento
                ) =>
                  alterarFormulario(
                    "observacao",
                    evento.target.value
                  )
                }
                disabled={
                  salvando
                }
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Observações da compra..."
              />
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/compras"
                )
              }
              disabled={
                salvando
              }
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                salvando ||
                carregandoFornecedores
              }
              className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando
                ? "Criando entrada..."
                : "Salvar como rascunho"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}