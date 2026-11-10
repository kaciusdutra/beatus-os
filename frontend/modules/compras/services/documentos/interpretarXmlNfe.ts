// Interpreta o XML de uma NF-e (modelo 55) ou NFC-e (modelo 65), layout 4.00.
//
// Aceita o XML "processado" (<nfeProc> com <NFe> e <protNFe>) e o XML só
// com a nota (<NFe>), que não traz o protocolo de autorização da SEFAZ.
//
// Este leitor não usa bibliotecas: monta uma árvore simples do XML e lê os
// campos pelo nome das tags (o layout é fixo, definido pela SEFAZ). Ele não
// confere a assinatura digital nem consulta a SEFAZ.
//
// Sem dependências de servidor: roda no navegador e nos testes.

// --------------------------------------------------
// Árvore do XML
// --------------------------------------------------

interface NoXml {
  // Nome sem prefixo de namespace (ex.: "nfe:det" vira "det").
  nome: string;
  atributos: Record<string, string>;
  filhos: NoXml[];
  texto: string;
}

function decodificarEntidades(
  valor: string
): string {
  return valor.replace(
    /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g,
    (_trecho, entidade: string) => {
      switch (entidade) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
        default:
          return String.fromCodePoint(
            entidade.startsWith("#x")
              ? parseInt(entidade.slice(2), 16)
              : parseInt(entidade.slice(1), 10)
          );
      }
    }
  );
}

function semPrefixo(nome: string): string {
  const indice = nome.indexOf(":");

  return indice === -1
    ? nome
    : nome.slice(indice + 1);
}

function lerAtributos(
  trecho: string
): Record<string, string> {
  const atributos: Record<string, string> = {};

  const padrao =
    /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

  let encontrado: RegExpExecArray | null;

  while (
    (encontrado = padrao.exec(trecho)) !== null
  ) {
    atributos[semPrefixo(encontrado[1])] =
      decodificarEntidades(
        encontrado[3] ?? encontrado[4] ?? ""
      );
  }

  return atributos;
}

// Lança erro se o XML estiver malformado (tag sem fechamento etc.).
function montarArvore(xml: string): NoXml {
  const raiz: NoXml = {
    nome: "#documento",
    atributos: {},
    filhos: [],
    texto: "",
  };

  const pilha: NoXml[] = [raiz];

  let posicao = 0;

  while (posicao < xml.length) {
    const inicio = xml.indexOf("<", posicao);

    if (inicio === -1) {
      break;
    }

    if (inicio > posicao) {
      pilha[pilha.length - 1].texto +=
        decodificarEntidades(
          xml.slice(posicao, inicio)
        );
    }

    if (xml.startsWith("<!--", inicio)) {
      const fim = xml.indexOf("-->", inicio);

      if (fim === -1) {
        throw new Error("Comentário sem fechamento.");
      }

      posicao = fim + 3;
      continue;
    }

    if (xml.startsWith("<![CDATA[", inicio)) {
      const fim = xml.indexOf("]]>", inicio);

      if (fim === -1) {
        throw new Error("CDATA sem fechamento.");
      }

      pilha[pilha.length - 1].texto += xml.slice(
        inicio + 9,
        fim
      );

      posicao = fim + 3;
      continue;
    }

    if (
      xml.startsWith("<?", inicio) ||
      xml.startsWith("<!", inicio)
    ) {
      const fim = xml.indexOf(">", inicio);

      if (fim === -1) {
        throw new Error("Declaração sem fechamento.");
      }

      posicao = fim + 1;
      continue;
    }

    const fim = xml.indexOf(">", inicio);

    if (fim === -1) {
      throw new Error("Tag sem fechamento.");
    }

    const conteudo = xml.slice(inicio + 1, fim);

    if (conteudo.startsWith("/")) {
      const nome = semPrefixo(
        conteudo.slice(1).trim()
      );

      const atual = pilha.pop();

      if (!atual || atual.nome !== nome) {
        throw new Error(
          `Fechamento inesperado de <${nome}>.`
        );
      }
    } else {
      const autoFechada = conteudo.endsWith("/");

      const corpo = autoFechada
        ? conteudo.slice(0, -1)
        : conteudo;

      const separador = corpo.search(/\s/);

      const nome = semPrefixo(
        separador === -1
          ? corpo
          : corpo.slice(0, separador)
      );

      const no: NoXml = {
        nome,
        atributos:
          separador === -1
            ? {}
            : lerAtributos(corpo.slice(separador)),
        filhos: [],
        texto: "",
      };

      pilha[pilha.length - 1].filhos.push(no);

      if (!autoFechada) {
        pilha.push(no);
      }
    }

    posicao = fim + 1;
  }

  if (pilha.length !== 1) {
    throw new Error(
      `A tag <${pilha[pilha.length - 1].nome}> não foi fechada.`
    );
  }

  return raiz;
}

function filho(
  no: NoXml | undefined,
  nome: string
): NoXml | undefined {
  return no?.filhos.find(
    (item) => item.nome === nome
  );
}

function filhos(
  no: NoXml | undefined,
  nome: string
): NoXml[] {
  return (
    no?.filhos.filter(
      (item) => item.nome === nome
    ) ?? []
  );
}

// Busca em profundidade o primeiro nó com o nome.
function buscar(
  no: NoXml | undefined,
  nome: string
): NoXml | undefined {
  if (!no) {
    return undefined;
  }

  for (const item of no.filhos) {
    if (item.nome === nome) {
      return item;
    }

    const encontrado = buscar(item, nome);

    if (encontrado) {
      return encontrado;
    }
  }

  return undefined;
}

function texto(
  no: NoXml | undefined,
  nome: string
): string | undefined {
  const valor = filho(no, nome)?.texto.trim();

  return valor ? valor : undefined;
}

function numero(
  no: NoXml | undefined,
  nome: string
): number {
  const valor = Number(texto(no, nome) ?? "0");

  return Number.isFinite(valor) ? valor : 0;
}

// --------------------------------------------------
// Dados da nota
// --------------------------------------------------

export type ModeloNotaXml = "55" | "65";

export interface EnderecoEmitenteXml {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

export interface EmitenteXmlNfe {
  cnpj?: string;
  cpf?: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  telefone?: string;
  endereco: EnderecoEmitenteXml;
}

export interface ItemXmlNfe {
  // nItem da nota (1, 2, 3...).
  numeroItem: number;
  // Código do produto no fornecedor (cProd).
  codigo?: string;
  ean?: string;
  descricao: string;
  ncm?: string;
  cfop?: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  // Valor bruto do item (vProd = quantidade × valor unitário).
  valorProdutos: number;
  desconto: number;
  lote?: string;
  // AAAA-MM-DD
  validade?: string;
}

export interface TotaisXmlNfe {
  produtos: number;
  desconto: number;
  frete: number;
  seguro: number;
  outrasDespesas: number;
  ipi: number;
  icmsSt: number;
  // vNF: o que foi pago pela nota.
  total: number;
}

export interface NotaXmlNfe {
  chaveAcesso: string;
  modelo: ModeloNotaXml;
  numero: string;
  serie: string;
  // AAAA-MM-DD (data local do emitente).
  dataEmissao?: string;
  // AAAA-MM-DDTHH:MM (horário local do emitente), quando a nota traz a hora.
  dataHoraEmissao?: string;
  ambiente: "PRODUCAO" | "HOMOLOGACAO";
  emitente: EmitenteXmlNfe;
  itens: ItemXmlNfe[];
  totais: TotaisXmlNfe;
  // true quando o XML traz o protocolo da SEFAZ com cStat 100 (autorizada).
  autorizada: boolean;
  protocolo?: string;
  // Situação informada no protocolo, quando não for autorizada.
  situacaoProtocolo?: string;
}

export type InterpretacaoXmlNfe =
  | {
      sucesso: true;
      nota: NotaXmlNfe;
    }
  | {
      sucesso: false;
      motivo: string;
    };

// Dígito verificador da chave de acesso (módulo 11, pesos 2 a 9).
export function chaveAcessoValida(
  chave: string
): boolean {
  if (!/^\d{44}$/.test(chave)) {
    return false;
  }

  let soma = 0;
  let peso = 2;

  for (let indice = 42; indice >= 0; indice--) {
    soma += Number(chave[indice]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;

  const digito = resto < 2 ? 0 : 11 - resto;

  return digito === Number(chave[43]);
}

function dataDoTexto(
  valor?: string
): string | undefined {
  const encontrado = valor?.match(
    /^(\d{4}-\d{2}-\d{2})/
  );

  return encontrado?.[1];
}

function lerEmitente(
  emit: NoXml
): EmitenteXmlNfe {
  const endereco = filho(emit, "enderEmit");

  return {
    cnpj: texto(emit, "CNPJ"),
    cpf: texto(emit, "CPF"),
    razaoSocial: texto(emit, "xNome") ?? "",
    nomeFantasia: texto(emit, "xFant"),
    inscricaoEstadual: texto(emit, "IE"),
    telefone: texto(endereco, "fone"),
    endereco: {
      logradouro: texto(endereco, "xLgr"),
      numero: texto(endereco, "nro"),
      complemento: texto(endereco, "xCpl"),
      bairro: texto(endereco, "xBairro"),
      municipio: texto(endereco, "xMun"),
      uf: texto(endereco, "UF"),
      cep: texto(endereco, "CEP"),
    },
  };
}

function lerItem(det: NoXml): ItemXmlNfe {
  const prod = filho(det, "prod");

  // Rastreabilidade (lote e validade): usa o primeiro lote informado.
  const rastro = filhos(prod, "rastro")[0];

  const ean = texto(prod, "cEAN");

  return {
    numeroItem: Number(
      det.atributos.nItem ?? "0"
    ),
    codigo: texto(prod, "cProd"),
    ean:
      ean && ean.toUpperCase() !== "SEM GTIN"
        ? ean
        : undefined,
    descricao: texto(prod, "xProd") ?? "",
    ncm: texto(prod, "NCM"),
    cfop: texto(prod, "CFOP"),
    unidade: texto(prod, "uCom") ?? "",
    quantidade: numero(prod, "qCom"),
    valorUnitario: numero(prod, "vUnCom"),
    valorProdutos: numero(prod, "vProd"),
    desconto: numero(prod, "vDesc"),
    lote: texto(rastro, "nLote"),
    validade: dataDoTexto(texto(rastro, "dVal")),
  };
}

export function interpretarXmlNfe(
  xml: string
): InterpretacaoXmlNfe {
  if (!xml || !xml.trim()) {
    return {
      sucesso: false,
      motivo: "O arquivo está vazio.",
    };
  }

  let documento: NoXml;

  try {
    documento = montarArvore(
      // Remove o BOM, se houver.
      xml.replace(/^﻿/, "")
    );
  } catch (error) {
    return {
      sucesso: false,
      motivo: `O arquivo não é um XML válido (${
        error instanceof Error
          ? error.message
          : "erro de leitura"
      }).`,
    };
  }

  const infNFe = buscar(documento, "infNFe");

  if (!infNFe) {
    return {
      sucesso: false,
      motivo:
        "Este XML não é de uma NF-e ou NFC-e (não tem a tag infNFe).",
    };
  }

  const ide = filho(infNFe, "ide");
  const emit = filho(infNFe, "emit");

  const modelo = texto(ide, "mod");

  if (modelo !== "55" && modelo !== "65") {
    return {
      sucesso: false,
      motivo: `Modelo de documento não suportado (${
        modelo ?? "não informado"
      }). Só NF-e (55) e NFC-e (65).`,
    };
  }

  if (!emit) {
    return {
      sucesso: false,
      motivo: "O XML não traz o emitente da nota.",
    };
  }

  const chaveAcesso = (
    infNFe.atributos.Id ?? ""
  ).replace(/^NFe/, "");

  if (!chaveAcessoValida(chaveAcesso)) {
    return {
      sucesso: false,
      motivo:
        "A chave de acesso do XML é inválida.",
    };
  }

  const itens = filhos(infNFe, "det").map(
    lerItem
  );

  if (itens.length === 0) {
    return {
      sucesso: false,
      motivo: "O XML não traz itens.",
    };
  }

  const icmsTot = filho(
    filho(infNFe, "total"),
    "ICMSTot"
  );

  // Protocolo de autorização (só no XML processado, <nfeProc>).
  const infProt = filho(
    buscar(documento, "protNFe"),
    "infProt"
  );

  const situacao = texto(infProt, "cStat");

  const motivoProtocolo = texto(
    infProt,
    "xMotivo"
  );

  return {
    sucesso: true,
    nota: {
      chaveAcesso,
      modelo,
      numero: texto(ide, "nNF") ?? "",
      serie: texto(ide, "serie") ?? "",
      dataEmissao: dataDoTexto(
        texto(ide, "dhEmi") ??
          texto(ide, "dEmi")
      ),
      dataHoraEmissao: texto(
        ide,
        "dhEmi"
      )?.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
      )?.[0],
      ambiente:
        texto(ide, "tpAmb") === "2"
          ? "HOMOLOGACAO"
          : "PRODUCAO",
      emitente: lerEmitente(emit),
      itens,
      totais: {
        produtos: numero(icmsTot, "vProd"),
        desconto: numero(icmsTot, "vDesc"),
        frete: numero(icmsTot, "vFrete"),
        seguro: numero(icmsTot, "vSeg"),
        outrasDespesas: numero(icmsTot, "vOutro"),
        ipi: numero(icmsTot, "vIPI"),
        icmsSt: numero(icmsTot, "vST"),
        total: numero(icmsTot, "vNF"),
      },
      autorizada: situacao === "100",
      protocolo: texto(infProt, "nProt"),
      situacaoProtocolo:
        situacao && situacao !== "100"
          ? `${situacao} - ${motivoProtocolo ?? ""}`.trim()
          : undefined,
    },
  };
}

// Diferença entre o total da nota (vNF) e o total que a entrada registra
// (produtos − descontos + frete). Aparece quando a nota tem ST, IPI,
// seguro ou outras despesas.
export function diferencaTotalNota(
  totais: TotaisXmlNfe
): number {
  const totalEntrada =
    totais.produtos -
    totais.desconto +
    totais.frete;

  return (
    Math.round(
      (totais.total - totalEntrada) * 100
    ) / 100
  );
}
