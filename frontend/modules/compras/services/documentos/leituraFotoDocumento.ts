// Leitura de documentos de compra por foto (bloco 7F).
//
// A IA lê a foto (nota fiscal, cupom ou recibo manuscrito) e devolve um JSON.
// Este módulo valida e organiza essa resposta, confere os números e marca o
// que a pessoa precisa conferir. Ele NÃO chama a IA e não tem dependências de
// servidor: roda nos testes e na tela.
//
// A leitura nunca grava nada sozinha: ela só preenche a tela para conferência.

import {
  chaveAcessoValida,
} from "./interpretarXmlNfe";

import {
  cnpjValido,
  cpfValido,
  somenteDigitos,
} from "@/modules/fornecedores/domain/documentoFornecedor";

export type TipoDocumentoLido =
  | "NOTA_FISCAL"
  | "RECIBO"
  | "COMPROVANTE"
  | "OUTRO";

const TIPOS_DOCUMENTO: TipoDocumentoLido[] = [
  "NOTA_FISCAL",
  "RECIBO",
  "COMPROVANTE",
  "OUTRO",
];

// Campos que a IA pode marcar como "incerto" (e que a tela destaca).
export type CampoIncerto =
  | "emitente"
  | "documento"
  | "numero"
  | "serie"
  | "chave"
  | "data"
  | "desconto"
  | "frete"
  | "total";

const CAMPOS_INCERTOS: CampoIncerto[] = [
  "emitente",
  "documento",
  "numero",
  "serie",
  "chave",
  "data",
  "desconto",
  "frete",
  "total",
];

export interface EmitenteLidoFoto {
  nome?: string;
  // Só dígitos; só vem quando o CNPJ ou o CPF lido tem os dígitos corretos.
  documento?: string;
  tipoDocumento?: "CNPJ" | "CPF";
  telefone?: string;
}

export interface ItemLidoFoto {
  descricao: string;
  codigo?: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  desconto: number;
  // true = a pessoa precisa conferir este item com o papel.
  incerto: boolean;
  motivoIncerteza?: string;
}

export interface LeituraFotoDocumento {
  tipoDocumento: TipoDocumentoLido;
  // true quando o documento é escrito à mão.
  manuscrito: boolean;
  emitente: EmitenteLidoFoto;
  numeroDocumento?: string;
  serie?: string;
  chaveAcesso?: string;
  // AAAA-MM-DD
  dataDocumento?: string;
  itens: ItemLidoFoto[];
  desconto: number;
  frete: number;
  valorTotal?: number;
  camposIncertos: CampoIncerto[];
  // Avisos em português para a pessoa conferir (números que não batem etc.).
  avisos: string[];
  observacoes?: string;
}

export class ErroRespostaLeituraFoto extends Error {}

// --------------------------------------------------
// Leitura segura dos valores
// --------------------------------------------------

function texto(
  valor: unknown
): string | undefined {
  if (typeof valor === "number") {
    return String(valor);
  }

  if (typeof valor !== "string") {
    return undefined;
  }

  const limpo = valor.trim();

  return limpo && limpo.toLowerCase() !== "null"
    ? limpo
    : undefined;
}

// Aceita número ou texto no formato brasileiro ("R$ 1.234,50").
function numero(
  valor: unknown
): number | undefined {
  if (typeof valor === "number") {
    return Number.isFinite(valor)
      ? valor
      : undefined;
  }

  const bruto = texto(valor);

  if (!bruto) {
    return undefined;
  }

  let limpo = bruto.replace(/[^\d,.-]/g, "");

  if (limpo.includes(",")) {
    limpo = limpo
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const convertido = Number(limpo);

  return limpo && Number.isFinite(convertido)
    ? convertido
    : undefined;
}

function arredondar(
  valor: number,
  casas = 4
): number {
  const fator = 10 ** casas;

  return Math.round(valor * fator) / fator;
}

function reais(valor: number): string {
  return `R$ ${valor
    .toFixed(2)
    .replace(".", ",")}`;
}

function dataValida(
  valor: unknown
): string | undefined {
  const bruto = texto(valor);

  if (!bruto || !/^\d{4}-\d{2}-\d{2}$/.test(bruto)) {
    return undefined;
  }

  const data = new Date(`${bruto}T00:00:00Z`);

  return !Number.isNaN(data.getTime()) &&
    data.toISOString().startsWith(bruto)
    ? bruto
    : undefined;
}

// Extrai o objeto JSON da resposta, mesmo que venha entre ``` ou com texto.
function extrairJson(
  resposta: string
): unknown {
  const inicio = resposta.indexOf("{");
  const fim = resposta.lastIndexOf("}");

  if (inicio === -1 || fim <= inicio) {
    throw new ErroRespostaLeituraFoto(
      "A IA não devolveu os dados no formato esperado."
    );
  }

  try {
    return JSON.parse(
      resposta.slice(inicio, fim + 1)
    );
  } catch {
    throw new ErroRespostaLeituraFoto(
      "A resposta da IA veio incompleta ou fora do formato."
    );
  }
}

// --------------------------------------------------
// Itens
// --------------------------------------------------

function lerItem(
  bruto: unknown
): ItemLidoFoto | undefined {
  if (!bruto || typeof bruto !== "object") {
    return undefined;
  }

  const item = bruto as Record<string, unknown>;

  const descricao = texto(item.descricao);

  if (!descricao) {
    return undefined;
  }

  const motivos: string[] = [];

  const motivoIa = texto(
    item.motivoIncerteza
  );

  if (item.incerto === true) {
    motivos.push(
      motivoIa ?? "A IA ficou em dúvida neste item."
    );
  }

  let quantidade = numero(item.quantidade);

  if (quantidade === undefined || quantidade <= 0) {
    quantidade = 1;
    motivos.push("quantidade não lida (preenchi 1)");
  }

  const total = numero(item.valorTotal);

  const desconto = Math.max(
    0,
    numero(item.desconto) ?? 0
  );

  let valorUnitario = numero(item.valorUnitario);

  if (valorUnitario === undefined) {
    if (total !== undefined) {
      valorUnitario = arredondar(
        (total + desconto) / quantidade
      );
    } else {
      valorUnitario = 0;
      motivos.push("valor não lido");
    }
  } else if (total !== undefined) {
    const calculado =
      quantidade * valorUnitario - desconto;

    if (Math.abs(calculado - total) > 0.02) {
      motivos.push(
        `quantidade × valor unitário dá ${reais(calculado)}, mas o total do item lido é ${reais(total)}`
      );
    }
  }

  if (valorUnitario < 0) {
    valorUnitario = Math.abs(valorUnitario);
  }

  const unidade = texto(item.unidade);

  if (!unidade) {
    motivos.push("unidade não informada (preenchi un)");
  }

  return {
    descricao,
    codigo: texto(item.codigo),
    unidade: unidade ?? "un",
    quantidade: arredondar(quantidade),
    valorUnitario,
    desconto: arredondar(desconto, 2),
    incerto: motivos.length > 0,
    motivoIncerteza:
      motivos.length > 0
        ? motivos.join("; ")
        : undefined,
  };
}

// --------------------------------------------------
// Resposta completa
// --------------------------------------------------

export function interpretarRespostaLeituraFoto(
  resposta: string
): LeituraFotoDocumento {
  const dados = extrairJson(resposta);

  if (!dados || typeof dados !== "object") {
    throw new ErroRespostaLeituraFoto(
      "A IA não devolveu os dados no formato esperado."
    );
  }

  const bruto = dados as Record<string, unknown>;

  const avisos: string[] = [];

  const tipoLido = texto(bruto.tipoDocumento);

  const tipoDocumento: TipoDocumentoLido =
    TIPOS_DOCUMENTO.find(
      (tipo) => tipo === tipoLido
    ) ?? "OUTRO";

  // Emitente
  const emit =
    bruto.emitente &&
    typeof bruto.emitente === "object"
      ? (bruto.emitente as Record<string, unknown>)
      : {};

  const emitente: EmitenteLidoFoto = {
    nome: texto(emit.nome),
    telefone: texto(emit.telefone)
      ? somenteDigitos(texto(emit.telefone)) ||
        undefined
      : undefined,
  };

  const documentoLido = somenteDigitos(
    texto(emit.documento)
  );

  if (documentoLido) {
    if (
      documentoLido.length === 14 &&
      cnpjValido(documentoLido)
    ) {
      emitente.documento = documentoLido;
      emitente.tipoDocumento = "CNPJ";
    } else if (
      documentoLido.length === 11 &&
      cpfValido(documentoLido)
    ) {
      emitente.documento = documentoLido;
      emitente.tipoDocumento = "CPF";
    } else {
      avisos.push(
        `O CPF/CNPJ lido (${documentoLido}) não tem os dígitos corretos. Confira com o papel.`
      );
    }
  }

  // Chave de acesso (só nota fiscal)
  const chaveLida = somenteDigitos(
    texto(bruto.chaveAcesso)
  );

  let chaveAcesso: string | undefined;

  if (chaveLida) {
    if (chaveAcessoValida(chaveLida)) {
      chaveAcesso = chaveLida;
    } else {
      avisos.push(
        "A chave de acesso lida não tem 44 dígitos válidos, então não foi preenchida. Confira com a nota."
      );
    }
  }

  // Itens
  const itens = (
    Array.isArray(bruto.itens)
      ? bruto.itens
      : []
  )
    .map(lerItem)
    .filter(
      (item): item is ItemLidoFoto =>
        item !== undefined
    );

  if (itens.length === 0) {
    avisos.push(
      "Nenhum item foi reconhecido na foto. Tente uma foto mais nítida ou digite os itens."
    );
  }

  const desconto = Math.max(
    0,
    numero(bruto.desconto) ?? 0
  );

  const frete = Math.max(
    0,
    numero(bruto.frete) ?? 0
  );

  const valorTotal = numero(bruto.valorTotal);

  // Conferência da soma: produtos − desconto + frete = total do documento
  if (valorTotal !== undefined && itens.length > 0) {
    const produtos = itens.reduce(
      (soma, item) =>
        soma +
        item.quantidade * item.valorUnitario -
        item.desconto,
      0
    );

    const esperado = produtos - desconto + frete;

    if (Math.abs(esperado - valorTotal) > 0.05) {
      avisos.push(
        `A soma dos itens${
          frete > 0 ? " com o frete" : ""
        } dá ${reais(esperado)}, mas o total lido no documento é ${reais(valorTotal)}. Algum item ou valor pode ter sido lido errado.`
      );
    }
  }

  const camposIncertos = (
    Array.isArray(bruto.camposIncertos)
      ? bruto.camposIncertos
      : []
  ).filter(
    (campo): campo is CampoIncerto =>
      typeof campo === "string" &&
      CAMPOS_INCERTOS.includes(
        campo as CampoIncerto
      )
  );

  return {
    tipoDocumento,
    manuscrito: bruto.manuscrito === true,
    emitente,
    numeroDocumento: texto(bruto.numeroDocumento),
    serie: texto(bruto.serie),
    chaveAcesso,
    dataDocumento: dataValida(bruto.dataDocumento),
    itens,
    desconto: arredondar(desconto, 2),
    frete: arredondar(frete, 2),
    valorTotal:
      valorTotal !== undefined
        ? arredondar(valorTotal, 2)
        : undefined,
    camposIncertos: [
      ...new Set(camposIncertos),
    ],
    avisos,
    observacoes: texto(bruto.observacoes),
  };
}

// --------------------------------------------------
// Custo da leitura (para repassar ao preço dos produtos)
// --------------------------------------------------

export interface UsoLeituraFoto {
  tokensEntrada: number;
  tokensSaida: number;
}

export interface PrecosLeituraFoto {
  // Reais por milhão de tokens; o usuário informa no .env depois de avaliar.
  entradaPorMilhao?: number;
  saidaPorMilhao?: number;
}

// undefined quando os preços não foram configurados.
export function estimarCustoLeituraFoto(
  uso: UsoLeituraFoto,
  precos: PrecosLeituraFoto
): number | undefined {
  const { entradaPorMilhao, saidaPorMilhao } =
    precos;

  if (
    entradaPorMilhao === undefined ||
    saidaPorMilhao === undefined ||
    !Number.isFinite(entradaPorMilhao) ||
    !Number.isFinite(saidaPorMilhao) ||
    entradaPorMilhao < 0 ||
    saidaPorMilhao < 0
  ) {
    return undefined;
  }

  return arredondar(
    (uso.tokensEntrada / 1_000_000) *
      entradaPorMilhao +
      (uso.tokensSaida / 1_000_000) *
        saidaPorMilhao,
    4
  );
}
