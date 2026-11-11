"use client";

import {
  ChangeEvent,
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
import {
  diferencaTotalNota,
  interpretarXmlNfe,
  type NotaXmlNfe,
} from "@/modules/compras/services/documentos/interpretarXmlNfe";
import { Fornecedor } from "@/modules/fornecedores/types/fornecedor";
import {
  cnpjValido,
  formatarCpf,
} from "@/modules/fornecedores/domain/documentoFornecedor";
import {
  type CampoIncerto,
  type LeituraFotoDocumento,
} from "@/modules/compras/services/documentos/leituraFotoDocumento";
import { formatarCep } from "@/modules/fornecedores/domain/enderecoFornecedor";

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
  // Vêm do XML da NF-e, quando a nota informa (rastreabilidade).
  lote?: string;
  validade?: string;
  // Vêm da leitura por foto: item que a pessoa precisa conferir com o papel.
  incerto?: boolean;
  motivoIncerteza?: string;
}

// Resposta da rota /api/compras/leitura-foto (bloco 7F).
interface ResultadoLeituraFotoTela {
  leitura: LeituraFotoDocumento;
  modelo: string;
  uso: {
    tokensEntrada: number;
    tokensSaida: number;
  };
  // Em reais; só vem quando os preços foram configurados no .env.
  custoEstimadoReais?: number;
}

type OrigemFornecedorFoto =
  | "DOCUMENTO"
  | "NOME"
  | "CONFIRMADO";

const ROTULO_CAMPO_INCERTO: Record<
  CampoIncerto,
  string
> = {
  emitente: "emitente",
  documento: "CPF/CNPJ",
  numero: "número",
  serie: "série",
  chave: "chave de acesso",
  data: "data",
  desconto: "desconto",
  frete: "frete",
  total: "total",
};

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
  // Impostos e outras despesas da nota: ficam fora do custo (regra 7.25).
  icmsSt: string;
  ipi: string;
  seguro: string;
  outrasDespesas: string;
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
  icmsSt: "0",
  ipi: "0",
  seguro: "0",
  outrasDespesas: "0",
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

function semAcento(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Sugere o fornecedor mais parecido pelo nome lido (ex.: recibo sem CPF/CNPJ).
// Só serve de sugestão: a pessoa confirma.
function encontrarFornecedorPorNome(
  fornecedores: Fornecedor[],
  nome: string
): Fornecedor | undefined {
  const procurado = semAcento(nome);

  if (procurado.length < 4) {
    return undefined;
  }

  return fornecedores.find((fornecedor) =>
    [
      fornecedor.nomeFantasia,
      fornecedor.razaoSocial,
    ].some((candidato) => {
      const comparado = semAcento(
        candidato ?? ""
      );

      return (
        comparado.length >= 4 &&
        (comparado.includes(procurado) ||
          procurado.includes(comparado))
      );
    })
  );
}

/*
 * Reduz a foto antes de enviar à IA: o tamanho da imagem define o custo da
 * leitura e uma foto de celular passa de 5 MB. A foto ORIGINAL continua sendo
 * guardada na entrada, sem nenhuma alteração.
 */
async function reduzirImagemParaLeitura(
  arquivo: File
): Promise<File> {
  const LADO_MAXIMO = 1800;

  const imagem = await createImageBitmap(arquivo);

  try {
    const escala = Math.min(
      1,
      LADO_MAXIMO /
        Math.max(imagem.width, imagem.height)
    );

    if (
      escala === 1 &&
      arquivo.type === "image/jpeg" &&
      arquivo.size <= 1.5 * 1024 * 1024
    ) {
      return arquivo;
    }

    const canvas =
      document.createElement("canvas");

    canvas.width = Math.round(
      imagem.width * escala
    );

    canvas.height = Math.round(
      imagem.height * escala
    );

    const contexto =
      canvas.getContext("2d");

    if (!contexto) {
      throw new Error(
        "Não foi possível preparar a imagem para a leitura."
      );
    }

    contexto.drawImage(
      imagem,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blob = await new Promise<Blob | null>(
      (resolver) =>
        canvas.toBlob(resolver, "image/jpeg", 0.85)
    );

    if (!blob) {
      throw new Error(
        "Não foi possível preparar a imagem para a leitura."
      );
    }

    return new File([blob], "leitura.jpg", {
      type: "image/jpeg",
    });
  } finally {
    imagem.close();
  }
}

// CNPJ do emitente do XML; CPF vira 14 dígitos, como na chave de acesso.
function documentoEmitenteXml(
  nota: NotaXmlNfe
): string {
  return (
    nota.emitente.cnpj ??
    (nota.emitente.cpf ?? "").padStart(14, "0")
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

  // XML da NF-e importado (bloco 7D).
  const [
    notaXml,
    setNotaXml,
  ] = useState<NotaXmlNfe | null>(
    null
  );

  const [
    fornecedorDoXml,
    setFornecedorDoXml,
  ] = useState<Fornecedor | null>(
    null
  );

  const [
    lendoXml,
    setLendoXml,
  ] = useState(false);

  const [
    cadastrandoFornecedor,
    setCadastrandoFornecedor,
  ] = useState(false);

  const [
    erroCadastroFornecedor,
    setErroCadastroFornecedor,
  ] = useState("");

  // Leitura dos itens por foto (bloco 7F).
  const [
    lendoFoto,
    setLendoFoto,
  ] = useState(false);

  const [
    leituraFoto,
    setLeituraFoto,
  ] =
    useState<ResultadoLeituraFotoTela | null>(
      null
    );

  const [
    erroLeituraFoto,
    setErroLeituraFoto,
  ] = useState("");

  const [
    fornecedorDaFoto,
    setFornecedorDaFoto,
  ] = useState<{
    fornecedor: Fornecedor;
    por: OrigemFornecedorFoto;
  } | null>(null);

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

      const documentoFoto =
        leituraFoto?.leitura.emitente.documento;

      if (
        documentoFoto &&
        fornecedorDaFoto?.por !== "DOCUMENTO"
      ) {
        const encontradoFoto =
          encontrarFornecedorPorDocumento(
            ativos,
            documentoFoto.padStart(14, "0")
          );

        if (encontradoFoto) {
          setFornecedorDaFoto({
            fornecedor: encontradoFoto,
            por: "DOCUMENTO",
          });

          setFormulario((anterior) => ({
            ...anterior,
            fornecedorId: encontradoFoto.id,
          }));
        }
      }

      if (notaXml && !fornecedorDoXml) {
        const encontradoXml =
          encontrarFornecedorPorDocumento(
            ativos,
            documentoEmitenteXml(notaXml)
          );

        if (encontradoXml) {
          setFornecedorDoXml(encontradoXml);

          setFormulario((anterior) => ({
            ...anterior,
            fornecedorId:
              anterior.fornecedorId ||
              encontradoXml.id,
          }));
        }
      }

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
                  // Quem edita o item já está conferindo.
                  incerto: false,
                  motivoIncerteza: undefined,
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
    setNotaXml(null);
    setFornecedorDoXml(null);
    setLeituraFoto(null);
    setFornecedorDaFoto(null);
    setErroLeituraFoto("");
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

  /*
   * Importa o XML da NF-e/NFC-e: preenche o
   * documento, o fornecedor (pelo CNPJ), os itens
   * e o frete. O XML fica anexado à entrada como
   * documento original quando ela for salva.
   */
  async function receberXml(
    evento: ChangeEvent<HTMLInputElement>
  ) {
    const arquivo =
      evento.target.files?.[0];

    // Permite escolher o mesmo arquivo de novo.
    evento.target.value = "";

    if (!arquivo) {
      return;
    }

    setErro("");
    setLendoXml(true);

    try {
      const interpretacao =
        interpretarXmlNfe(
          await arquivo.text()
        );

      if (!interpretacao.sucesso) {
        setErro(
          `Não foi possível importar o XML: ${interpretacao.motivo}`
        );

        return;
      }

      const nota = interpretacao.nota;

      const fornecedor =
        encontrarFornecedorPorDocumento(
          fornecedores,
          documentoEmitenteXml(nota)
        );

      setArquivoDocumento(arquivo);
      setQrConteudo(null);
      setInterpretacaoQr(null);
      setFornecedorDoQr(null);
      setNotaXml(nota);
      setFornecedorDoXml(fornecedor ?? null);
      setErroCadastroFornecedor("");
      setLeituraFoto(null);
      setFornecedorDaFoto(null);
      setErroLeituraFoto("");

      setFormulario((anterior) => ({
        ...anterior,
        fornecedorId:
          fornecedor?.id ?? "",
        tipoDocumento: "NOTA_FISCAL",
        numeroDocumento: nota.numero,
        serie: nota.serie,
        chaveAcesso: nota.chaveAcesso,
        dataDocumento:
          nota.dataHoraEmissao ??
          (nota.dataEmissao
            ? `${nota.dataEmissao}T00:00`
            : ""),
        // Os descontos da nota já vêm por item.
        desconto: "0",
        frete: String(nota.totais.frete),
        icmsSt: String(nota.totais.icmsSt),
        ipi: String(nota.totais.ipi),
        seguro: String(nota.totais.seguro),
        outrasDespesas: String(
          nota.totais.outrasDespesas
        ),
      }));

      setItens(
        nota.itens.map((item) => ({
          id: `xml-${item.numeroItem}`,
          descricaoOriginal: item.descricao,
          codigoFornecedor:
            item.codigo ?? "",
          quantidade: String(
            item.quantidade
          ),
          unidade: item.unidade,
          valorUnitario: String(
            item.valorUnitario
          ),
          desconto: String(item.desconto),
          lote: item.lote,
          validade: item.validade,
        }))
      );

      setModoNovaEntrada("MANUAL");
    } catch (error) {
      setErro(
        error instanceof Error
          ? `Não foi possível ler o arquivo: ${error.message}`
          : "Não foi possível ler o arquivo."
      );
    } finally {
      setLendoXml(false);
    }
  }

  /*
   * Cria o fornecedor direto do emitente do XML e já o
   * seleciona na entrada. Os dados vêm só da nota; o
   * destino padrão fica vazio (regra 9.21).
   */
  async function cadastrarFornecedorDoXml() {
    if (!notaXml) {
      return;
    }

    const { emitente } = notaXml;

    setCadastrandoFornecedor(true);
    setErroCadastroFornecedor("");

    try {
      const resposta = await fetch(
        "/api/fornecedores",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            razaoSocial: emitente.razaoSocial,
            nomeFantasia:
              emitente.nomeFantasia,
            cnpj: emitente.cnpj,
            cpf: emitente.cpf,
            telefone: emitente.telefone,
            inscricaoEstadual:
              emitente.inscricaoEstadual,
            cep: emitente.endereco.cep,
            logradouro:
              emitente.endereco.logradouro,
            numero: emitente.endereco.numero,
            complemento:
              emitente.endereco.complemento,
            bairro: emitente.endereco.bairro,
            municipio:
              emitente.endereco.municipio,
            uf: emitente.endereco.uf,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados?.sucesso) {
        throw new Error(
          dados?.mensagem ??
            "Não foi possível cadastrar o fornecedor."
        );
      }

      const novo: Fornecedor =
        dados.fornecedor;

      setFornecedores((anteriores) => [
        ...anteriores,
        novo,
      ]);

      setFornecedorDoXml(novo);

      setFormulario((anterior) => ({
        ...anterior,
        fornecedorId: novo.id,
      }));
    } catch (error) {
      setErroCadastroFornecedor(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o fornecedor."
      );
    } finally {
      setCadastrandoFornecedor(false);
    }
  }

  /*
   * Preenche a tela com o que a IA leu. Nada é salvo: a pessoa confere
   * (principalmente o que vier em amarelo) e só depois salva a entrada.
   */
  function aplicarLeituraFoto(
    resultado: ResultadoLeituraFotoTela
  ) {
    const { leitura } = resultado;

    const documento =
      leitura.emitente.documento;

    // CPF e CNPJ são comparados com 14 dígitos, como na chave de acesso.
    let encontrado = documento
      ? encontrarFornecedorPorDocumento(
          fornecedores,
          documento.padStart(14, "0")
        )
      : undefined;

    let por: OrigemFornecedorFoto =
      "DOCUMENTO";

    if (!encontrado && leitura.emitente.nome) {
      encontrado = encontrarFornecedorPorNome(
        fornecedores,
        leitura.emitente.nome
      );

      por = "NOME";
    }

    setLeituraFoto(resultado);
    setErroCadastroFornecedor("");

    setFornecedorDaFoto(
      encontrado
        ? { fornecedor: encontrado, por }
        : null
    );

    const ehNota =
      leitura.tipoDocumento === "NOTA_FISCAL";

    setFormulario((anterior) => ({
      ...anterior,
      // Achado pelo CPF/CNPJ: seleciona. Só pelo nome: apenas sugere.
      fornecedorId:
        encontrado && por === "DOCUMENTO"
          ? encontrado.id
          : anterior.fornecedorId,
      tipoDocumento: leitura.tipoDocumento,
      numeroDocumento:
        leitura.numeroDocumento ??
        anterior.numeroDocumento,
      serie: ehNota
        ? (leitura.serie ?? anterior.serie)
        : "",
      chaveAcesso: ehNota
        ? (leitura.chaveAcesso ??
          anterior.chaveAcesso)
        : "",
      dataDocumento: leitura.dataDocumento
        ? `${leitura.dataDocumento}T00:00`
        : anterior.dataDocumento,
      desconto: String(leitura.desconto),
      frete: String(leitura.frete),
    }));

    if (leitura.itens.length > 0) {
      setItens(
        leitura.itens.map((item, indice) => ({
          id: `foto-${indice + 1}`,
          descricaoOriginal: item.descricao,
          codigoFornecedor: item.codigo ?? "",
          quantidade: String(item.quantidade),
          unidade: item.unidade,
          valorUnitario: String(
            item.valorUnitario
          ),
          desconto: String(item.desconto),
          incerto: item.incerto,
          motivoIncerteza: item.motivoIncerteza,
        }))
      );
    }
  }

  async function lerItensDaFoto() {
    if (!arquivoDocumento || notaXml) {
      return;
    }

    setLendoFoto(true);
    setErroLeituraFoto("");

    try {
      const imagem =
        await reduzirImagemParaLeitura(
          arquivoDocumento
        );

      const corpo = new FormData();

      corpo.append("imagem", imagem);

      corpo.append(
        "tipoDocumento",
        formulario.tipoDocumento
      );

      const resposta = await fetch(
        "/api/compras/leitura-foto",
        {
          method: "POST",
          body: corpo,
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados?.sucesso) {
        throw new Error(
          dados?.mensagem ??
            "Não foi possível ler o documento agora. Digite os itens manualmente."
        );
      }

      aplicarLeituraFoto(
        dados as ResultadoLeituraFotoTela
      );
    } catch (error) {
      setErroLeituraFoto(
        error instanceof Error
          ? error.message
          : "Não foi possível ler o documento agora. Digite os itens manualmente."
      );
    } finally {
      setLendoFoto(false);
    }
  }

  // Cria o fornecedor com o que foi lido (CNPJ ou CPF válido + nome) e o seleciona.
  async function cadastrarFornecedorDaFoto() {
    const emitente =
      leituraFoto?.leitura.emitente;

    if (
      !emitente?.nome ||
      !emitente.documento ||
      !emitente.tipoDocumento
    ) {
      return;
    }

    setCadastrandoFornecedor(true);
    setErroCadastroFornecedor("");

    try {
      const resposta = await fetch(
        "/api/fornecedores",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            razaoSocial: emitente.nome,
            cnpj:
              emitente.tipoDocumento === "CNPJ"
                ? emitente.documento
                : undefined,
            cpf:
              emitente.tipoDocumento === "CPF"
                ? emitente.documento
                : undefined,
            telefone: emitente.telefone,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados?.sucesso) {
        throw new Error(
          dados?.mensagem ??
            "Não foi possível cadastrar o fornecedor."
        );
      }

      const novo: Fornecedor =
        dados.fornecedor;

      setFornecedores((anteriores) => [
        ...anteriores,
        novo,
      ]);

      setFornecedorDaFoto({
        fornecedor: novo,
        por: "DOCUMENTO",
      });

      setFormulario((anterior) => ({
        ...anterior,
        fornecedorId: novo.id,
      }));
    } catch (error) {
      setErroCadastroFornecedor(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o fornecedor."
      );
    } finally {
      setCadastrandoFornecedor(false);
    }
  }

  function limparCapturaDocumento() {
    setLeituraFoto(null);
    setFornecedorDaFoto(null);
    setErroLeituraFoto("");
    setNotaXml(null);
    setFornecedorDoXml(null);
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

              lote:
                item.lote || undefined,

              validade:
                item.validade || undefined,

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

              valorIcmsSt: Number(
                Number(formulario.icmsSt || 0).toFixed(2)
              ),

              valorIpi: Number(
                Number(formulario.ipi || 0).toFixed(2)
              ),

              valorSeguro: Number(
                Number(formulario.seguro || 0).toFixed(2)
              ),

              valorOutrasDespesas: Number(
                Number(formulario.outrasDespesas || 0).toFixed(2)
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
          notaXml
            ? // O Windows às vezes não informa o tipo do .xml.
              new File(
                [arquivoDocumento],
                arquivoDocumento.name,
                { type: "application/xml" }
              )
            : arquivoDocumento
        );

        formData.append(
          "tipoDocumento",
          formulario.tipoDocumento
        );

        formData.append(
          "origem",
          notaXml ? "XML" : "FOTOGRAFIA"
        );

        // A leitura (XML ou foto) preencheu a entrada.
        if (leituraFoto || notaXml) {
          formData.append(
            "statusLeitura",
            "EXTRAIDO"
          );
        }

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
                  Importar XML da NF-e
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Recebeu o XML do fornecedor (por
                  e-mail ou pelo portal)? Os dados da
                  nota, o fornecedor e todos os itens
                  vêm preenchidos para conferência.
                </p>
              </div>

              <label
                className={`inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${
                  lendoXml || salvando
                    ? "pointer-events-none opacity-60"
                    : ""
                }`}
              >
                {lendoXml
                  ? "Lendo o XML..."
                  : "📄 Escolher arquivo XML"}

                <input
                  type="file"
                  accept=".xml,application/xml,text/xml"
                  onChange={(evento) =>
                    void receberXml(evento)
                  }
                  disabled={
                    lendoXml || salvando
                  }
                  className="sr-only"
                />
              </label>
            </div>
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

              {arquivoDocumento && !notaXml && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Ler itens da foto (IA)
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    A IA lê a foto, inclusive recibo
                    escrito à mão, e preenche o
                    documento, o fornecedor e os itens.
                    Você confere tudo antes de salvar.
                    Cada leitura tem custo e envia a
                    imagem a um serviço externo
                    (Anthropic). Se você já digitou
                    itens, eles serão substituídos
                    pelos lidos.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void lerItensDaFoto()
                    }
                    disabled={lendoFoto || salvando}
                    className="mt-3 cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {lendoFoto
                      ? "Lendo a foto... (pode levar até 1 minuto)"
                      : leituraFoto
                        ? "🤖 Ler de novo"
                        : "🤖 Ler itens da foto"}
                  </button>

                  {erroLeituraFoto && (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      {erroLeituraFoto}
                    </p>
                  )}

                  {leituraFoto && (
                    <div className="mt-4 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
                      <p className="text-sm font-semibold">
                        ✓ Lido por IA: confira tudo com o
                        papel antes de salvar
                        {leituraFoto.leitura.manuscrito &&
                          " · documento escrito à mão"}
                      </p>

                      <p>
                        Itens lidos:{" "}
                        {leituraFoto.leitura.itens.length}
                        {leituraFoto.leitura.valorTotal !==
                          undefined &&
                          ` · Total lido no documento ${formatarMoeda(
                            leituraFoto.leitura.valorTotal
                          )}`}
                        {leituraFoto.leitura.itens.filter(
                          (item) => item.incerto
                        ).length > 0 &&
                          ` · ${
                            leituraFoto.leitura.itens.filter(
                              (item) => item.incerto
                            ).length
                          } em amarelo para conferir`}
                      </p>

                      <p>
                        Emitente lido:{" "}
                        <strong>
                          {leituraFoto.leitura.emitente
                            .nome ?? "não identificado"}
                        </strong>
                        {leituraFoto.leitura.emitente
                          .documento &&
                          ` · ${
                            leituraFoto.leitura.emitente
                              .tipoDocumento
                          } ${
                            leituraFoto.leitura.emitente
                              .tipoDocumento === "CNPJ"
                              ? formatarCnpj(
                                  leituraFoto.leitura
                                    .emitente.documento
                                )
                              : formatarCpf(
                                  leituraFoto.leitura
                                    .emitente.documento
                                )
                          }`}
                      </p>

                      {fornecedorDaFoto &&
                      fornecedorDaFoto.por !== "NOME" ? (
                        <p>
                          Fornecedor selecionado:{" "}
                          <strong>
                            {fornecedorDaFoto.fornecedor
                              .nomeFantasia ||
                              fornecedorDaFoto.fornecedor
                                .razaoSocial}
                          </strong>
                        </p>
                      ) : fornecedorDaFoto ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-800">
                          <p className="font-semibold">
                            Parece ser o fornecedor{" "}
                            {fornecedorDaFoto.fornecedor
                              .nomeFantasia ||
                              fornecedorDaFoto.fornecedor
                                .razaoSocial}
                            , mas o documento não foi
                            lido. Confirme.
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              setFormulario(
                                (anterior) => ({
                                  ...anterior,
                                  fornecedorId:
                                    fornecedorDaFoto
                                      .fornecedor.id,
                                })
                              );

                              setFornecedorDaFoto({
                                fornecedor:
                                  fornecedorDaFoto.fornecedor,
                                por: "CONFIRMADO",
                              });
                            }}
                            className="mt-2 cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700"
                          >
                            Usar este fornecedor
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-800">
                          <p className="font-semibold">
                            O emitente não está
                            cadastrado como fornecedor.
                          </p>

                          <div className="flex flex-wrap items-center gap-4">
                            {leituraFoto.leitura.emitente
                              .nome &&
                            leituraFoto.leitura.emitente
                              .documento ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void cadastrarFornecedorDaFoto()
                                }
                                disabled={
                                  cadastrandoFornecedor ||
                                  salvando
                                }
                                className="cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {cadastrandoFornecedor
                                  ? "Cadastrando..."
                                  : "Cadastrar com os dados lidos"}
                              </button>
                            ) : (
                              <span>
                                Sem CPF/CNPJ legível, o
                                cadastro automático não é
                                possível.
                              </span>
                            )}

                            <a
                              href={
                                leituraFoto.leitura.emitente
                                  .tipoDocumento === "CNPJ"
                                  ? `/compras/fornecedores?cnpj=${leituraFoto.leitura.emitente.documento}`
                                  : "/compras/fornecedores"
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline underline-offset-2 hover:text-amber-900"
                            >
                              ou cadastrar na tela de
                              fornecedores
                            </a>
                          </div>

                          {erroCadastroFornecedor && (
                            <p className="font-semibold text-red-700">
                              {erroCadastroFornecedor}
                            </p>
                          )}
                        </div>
                      )}

                      {leituraFoto.leitura.camposIncertos
                        .length > 0 && (
                        <p className="font-semibold text-amber-800">
                          Campos para conferir com o
                          papel:{" "}
                          {leituraFoto.leitura.camposIncertos
                            .map(
                              (campo) =>
                                ROTULO_CAMPO_INCERTO[campo]
                            )
                            .join(", ")}
                          .
                        </p>
                      )}

                      {leituraFoto.leitura.avisos.map(
                        (aviso) => (
                          <p
                            key={aviso}
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800"
                          >
                            {aviso}
                          </p>
                        )
                      )}

                      {leituraFoto.leitura
                        .observacoes && (
                        <p>
                          Observação da IA:{" "}
                          {leituraFoto.leitura.observacoes}
                        </p>
                      )}

                      <p className="text-blue-700">
                        Esta leitura usou{" "}
                        {leituraFoto.uso.tokensEntrada.toLocaleString(
                          "pt-BR"
                        )}{" "}
                        tokens de entrada e{" "}
                        {leituraFoto.uso.tokensSaida.toLocaleString(
                          "pt-BR"
                        )}{" "}
                        de saída
                        {leituraFoto.custoEstimadoReais !==
                        undefined
                          ? ` (≈ ${leituraFoto.custoEstimadoReais.toLocaleString(
                              "pt-BR",
                              {
                                style: "currency",
                                currency: "BRL",
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 4,
                              }
                            )})`
                          : " (configure os preços no .env para ver o custo em reais)"}
                        .
                      </p>
                    </div>
                  )}
                </div>
              )}

              {notaXml && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  <p className="font-semibold">
                    ✓ XML da{" "}
                    {notaXml.modelo === "65"
                      ? "NFC-e"
                      : "NF-e"}{" "}
                    lido
                    {notaXml.ambiente ===
                      "HOMOLOGACAO" &&
                      " (ambiente de HOMOLOGAÇÃO — nota sem valor fiscal)"}
                  </p>

                  <div className="mt-2 space-y-1 text-xs">
                    <p>
                      Série {notaXml.serie}
                      {" · "}Número{" "}
                      {notaXml.numero}
                      {notaXml.dataEmissao &&
                        ` · Emissão ${notaXml.dataEmissao
                          .split("-")
                          .reverse()
                          .join("/")}`}
                      {" · "}
                      {notaXml.itens.length}{" "}
                      item(ns)
                      {" · "}Total da nota{" "}
                      {formatarMoeda(
                        notaXml.totais.total
                      )}
                    </p>

                    <p>
                      Emitente:{" "}
                      <strong>
                        {notaXml.emitente
                          .nomeFantasia ||
                          notaXml.emitente
                            .razaoSocial}
                      </strong>
                      {notaXml.emitente.cnpj &&
                        ` · CNPJ ${formatarCnpj(
                          notaXml.emitente.cnpj
                        )}`}
                    </p>

                    {fornecedorDoXml ? (
                      <p>
                        Fornecedor encontrado:{" "}
                        <strong>
                          {fornecedorDoXml.nomeFantasia ||
                            fornecedorDoXml.razaoSocial}
                        </strong>
                      </p>
                    ) : (
                      <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-800">
                        <p className="font-semibold">
                          O emitente não está
                          cadastrado como
                          fornecedor.
                        </p>

                        <p>
                          {[
                            notaXml.emitente
                              .inscricaoEstadual &&
                              `IE ${notaXml.emitente.inscricaoEstadual}`,
                            notaXml.emitente
                              .endereco.logradouro &&
                              `${notaXml.emitente.endereco.logradouro}${
                                notaXml.emitente
                                  .endereco.numero
                                  ? `, ${notaXml.emitente.endereco.numero}`
                                  : ""
                              }`,
                            notaXml.emitente
                              .endereco.municipio &&
                              `${notaXml.emitente.endereco.municipio}${
                                notaXml.emitente
                                  .endereco.uf
                                  ? `/${notaXml.emitente.endereco.uf}`
                                  : ""
                              }`,
                            notaXml.emitente
                              .endereco.cep &&
                              `CEP ${formatarCep(notaXml.emitente.endereco.cep)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>

                        <div className="flex flex-wrap items-center gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              void cadastrarFornecedorDoXml()
                            }
                            disabled={
                              cadastrandoFornecedor ||
                              salvando
                            }
                            className="cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cadastrandoFornecedor
                              ? "Cadastrando..."
                              : "Cadastrar com os dados da nota"}
                          </button>

                          <a
                            href={
                              notaXml.emitente.cnpj
                                ? `/compras/fornecedores?cnpj=${notaXml.emitente.cnpj}`
                                : "/compras/fornecedores"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-amber-900"
                          >
                            ou cadastrar na tela de
                            fornecedores
                          </a>
                        </div>

                        {erroCadastroFornecedor && (
                          <p className="font-semibold text-red-700">
                            {erroCadastroFornecedor}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {!notaXml.autorizada && (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      {notaXml.situacaoProtocolo
                        ? `Atenção: a SEFAZ não autorizou esta nota (${notaXml.situacaoProtocolo}). Confira com o fornecedor antes de lançar.`
                        : "Atenção: este XML não traz o protocolo de autorização da SEFAZ. Peça ao fornecedor o XML autorizado ou confira a nota no portal da SEFAZ."}
                    </p>
                  )}

                  {diferencaTotalNota(
                    notaXml.totais
                  ) !== 0 && (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <strong>
                        O total da nota é{" "}
                        {formatarMoeda(
                          notaXml.totais.total
                        )}
                        , e a entrada registra{" "}
                        {formatarMoeda(
                          notaXml.totais.total -
                            diferencaTotalNota(
                              notaXml.totais
                            )
                        )}{" "}
                        (produtos − descontos +
                        frete).
                      </strong>{" "}
                      A diferença de{" "}
                      {formatarMoeda(
                        diferencaTotalNota(
                          notaXml.totais
                        )
                      )}{" "}
                      vem de:{" "}
                      {(
                        [
                          ["ICMS-ST", notaXml.totais.icmsSt],
                          ["IPI", notaXml.totais.ipi],
                          ["seguro", notaXml.totais.seguro],
                          ["outras despesas", notaXml.totais.outrasDespesas],
                        ] as [string, number][]
                      )
                        .filter(
                          ([, valor]) => valor > 0
                        )
                        .map(
                          ([nome, valor]) =>
                            `${nome} ${formatarMoeda(valor)}`
                        )
                        .join(", ") ||
                        "valores não detalhados no XML"}
                      . Por enquanto, esses valores
                      não entram no total da entrada.
                    </p>
                  )}
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
                    className={`rounded-2xl border p-5 ${
                      item.incerto
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
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

                    {item.incerto && (
                      <p className="mb-4 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">
                        Conferir com o papel:{" "}
                        {item.motivoIncerteza ??
                          "a IA ficou em dúvida neste item."}
                      </p>
                    )}

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
                          step="any"
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
                          step="any"
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

                      {(item.lote ||
                        item.validade) && (
                        <p className="text-xs text-slate-500 md:col-span-2 xl:col-span-4">
                          Da nota:
                          {item.lote &&
                            ` lote ${item.lote}`}
                          {item.lote &&
                            item.validade &&
                            " ·"}
                          {item.validade &&
                            ` validade ${item.validade
                              .split("-")
                              .reverse()
                              .join("/")}`}
                        </p>
                      )}

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

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">
                  Impostos e outras despesas da nota
                </p>

                <p className="text-xs text-slate-500">
                  Só para consulta: ficam fora do custo do
                  insumo e do total da entrada.
                </p>

                <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="icms-st"
                    className="mb-1 block text-xs font-semibold text-slate-600"
                  >
                    ICMS-ST
                  </label>

                  <input
                    id="icms-st"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.icmsSt}
                    onChange={(evento) =>
                      alterarFormulario(
                        "icmsSt",
                        evento.target.value
                      )
                    }
                    disabled={salvando}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ipi"
                    className="mb-1 block text-xs font-semibold text-slate-600"
                  >
                    IPI
                  </label>

                  <input
                    id="ipi"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.ipi}
                    onChange={(evento) =>
                      alterarFormulario(
                        "ipi",
                        evento.target.value
                      )
                    }
                    disabled={salvando}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label
                    htmlFor="seguro"
                    className="mb-1 block text-xs font-semibold text-slate-600"
                  >
                    Seguro
                  </label>

                  <input
                    id="seguro"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.seguro}
                    onChange={(evento) =>
                      alterarFormulario(
                        "seguro",
                        evento.target.value
                      )
                    }
                    disabled={salvando}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label
                    htmlFor="outras-despesas"
                    className="mb-1 block text-xs font-semibold text-slate-600"
                  >
                    Outras despesas
                  </label>

                  <input
                    id="outras-despesas"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.outrasDespesas}
                    onChange={(evento) =>
                      alterarFormulario(
                        "outrasDespesas",
                        evento.target.value
                      )
                    }
                    disabled={salvando}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                </div>
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