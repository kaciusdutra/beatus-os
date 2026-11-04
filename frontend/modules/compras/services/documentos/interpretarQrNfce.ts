// Interpreta o conteúdo do QR Code de uma NFC-e (modelo 65).
//
// Formatos aceitos (NT 2025.001 — Portal da NF-e):
//
//   Versão 2 (com CSC) — ainda é a mais comum:
//     online:       chave|2|tpAmb|idCSC|hash                          (5 campos)
//     contingência: chave|2|tpAmb|dia|vNF|digVal|idCSC|hash           (8 campos)
//
//   Versão 3 (sem CSC) — opcional para emitente com CNPJ:
//     online:       chave|3|tpAmb                                     (3 campos)
//     contingência: chave|3|tpAmb|dia|vNF|tpIdDest|idDest|assinatura  (8 campos)
//
// Este parser só lê e valida a estrutura do QR. Ele não confere o hash
// nem a assinatura (isso exige o CSC/certificado do emitente) e não
// consulta a SEFAZ.

export type AmbienteNfce =
  | "PRODUCAO"
  | "HOMOLOGACAO";

export type TipoEmissaoQrNfce =
  | "ONLINE"
  | "CONTINGENCIA";

// Dados que a própria chave de acesso carrega.
// Layout da chave (44 dígitos):
//   cUF(2) AAMM(4) CNPJ/CPF(14) modelo(2) série(3) número(9)
//   tpEmis(1) código numérico(8) dígito verificador(1)
export interface DadosChaveNfce {
  codigoUf: string;
  // Ano e mês de emissão no formato AAAA-MM.
  anoMesEmissao: string;
  // CNPJ do emitente (14 dígitos). Para emitente pessoa física,
  // o CPF vem com zeros à esquerda.
  documentoEmitente: string;
  serie: string;
  numero: string;
}

export interface InterpretacaoQrNfce {
  ehNfce: boolean;
  urlOriginal: string;
  chaveAcesso?: string;
  dadosChave?: DadosChaveNfce;
  versaoQr?: number;
  ambiente?: AmbienteNfce;
  tipoEmissao?: TipoEmissaoQrNfce;
  // Só vêm no QR de contingência:
  diaEmissao?: number;
  valorTotal?: number;
  parametros?: string[];
  motivo?: string;
}

const MODELO_NFCE = "65";

// Quantidade de campos do parâmetro "p" por versão e tipo de emissão.
const CAMPOS_POR_VERSAO: Record<
  number,
  { online: number; contingencia: number }
> = {
  2: { online: 5, contingencia: 8 },
  3: { online: 3, contingencia: 8 },
};

function extrairParametroP(
  conteudo: string
): string | undefined {
  const texto = conteudo.trim();

  if (!texto) {
    return undefined;
  }

  try {
    const url = new URL(texto);

    for (const [
      nome,
      valor,
    ] of url.searchParams.entries()) {
      if (
        nome.toLowerCase() === "p"
      ) {
        return valor.trim() || undefined;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function obterAmbiente(
  valor: string
): AmbienteNfce | undefined {
  if (valor === "1") {
    return "PRODUCAO";
  }

  if (valor === "2") {
    return "HOMOLOGACAO";
  }

  return undefined;
}

function obterModeloDaChave(
  chaveAcesso: string
): string {
  return chaveAcesso.substring(
    20,
    22
  );
}

function extrairDadosChave(
  chaveAcesso: string
): DadosChaveNfce {
  const ano =
    chaveAcesso.substring(2, 4);

  const mes =
    chaveAcesso.substring(4, 6);

  return {
    codigoUf:
      chaveAcesso.substring(0, 2),
    anoMesEmissao: `20${ano}-${mes}`,
    documentoEmitente:
      chaveAcesso.substring(6, 20),
    // Série e número sem os zeros à esquerda, como aparecem no cupom.
    serie: String(
      Number(
        chaveAcesso.substring(22, 25)
      )
    ),
    numero: String(
      Number(
        chaveAcesso.substring(25, 34)
      )
    ),
  };
}

function obterTipoEmissao(
  versaoQr: number,
  quantidadeCampos: number
): TipoEmissaoQrNfce | undefined {
  const esperado =
    CAMPOS_POR_VERSAO[versaoQr];

  if (!esperado) {
    return undefined;
  }

  if (
    quantidadeCampos ===
    esperado.online
  ) {
    return "ONLINE";
  }

  if (
    quantidadeCampos ===
    esperado.contingencia
  ) {
    return "CONTINGENCIA";
  }

  return undefined;
}

function lerDiaEmissao(
  valor: string
): number | undefined {
  if (!/^\d{1,2}$/.test(valor)) {
    return undefined;
  }

  const dia = Number(valor);

  if (dia < 1 || dia > 31) {
    return undefined;
  }

  return dia;
}

function lerValorTotal(
  valor: string
): number | undefined {
  // vNF vem com ponto como separador decimal (ex.: 123.45).
  if (!/^\d+(\.\d{1,2})?$/.test(valor)) {
    return undefined;
  }

  return Number(valor);
}

export function interpretarQrNfce(
  conteudo: string
): InterpretacaoQrNfce {
  const urlOriginal =
    conteudo.trim();

  if (!urlOriginal) {
    return {
      ehNfce: false,
      urlOriginal,
      motivo:
        "Conteúdo do QR Code vazio.",
    };
  }

  const parametroP =
    extrairParametroP(urlOriginal);

  if (!parametroP) {
    return {
      ehNfce: false,
      urlOriginal,
      motivo:
        "QR Code não contém o parâmetro fiscal esperado.",
    };
  }

  const partes = parametroP
    .split("|")
    .map((parte) => parte.trim());

  if (partes.length < 3) {
    return {
      ehNfce: false,
      urlOriginal,
      parametros: partes,
      motivo:
        "QR Code NFC-e não possui os parâmetros mínimos esperados.",
    };
  }

  const chaveAcesso =
    partes[0] ?? "";

  const versaoQrTexto =
    partes[1] ?? "";

  const ambienteTexto =
    partes[2] ?? "";

  if (
    !/^\d{44}$/.test(
      chaveAcesso
    )
  ) {
    return {
      ehNfce: false,
      urlOriginal,
      parametros: partes,
      motivo:
        "A chave de acesso do QR Code não possui 44 dígitos.",
    };
  }

  if (
    obterModeloDaChave(
      chaveAcesso
    ) !== MODELO_NFCE
  ) {
    return {
      ehNfce: false,
      urlOriginal,
      parametros: partes,
      motivo:
        "A chave de acesso não pertence a uma NFC-e (modelo 65).",
    };
  }

  const versaoQr =
    Number(versaoQrTexto);

  if (!CAMPOS_POR_VERSAO[versaoQr]) {
    return {
      ehNfce: false,
      urlOriginal,
      parametros: partes,
      motivo:
        "Versão de QR Code NFC-e não suportada.",
    };
  }

  const ambiente =
    obterAmbiente(
      ambienteTexto
    );

  if (!ambiente) {
    return {
      ehNfce: false,
      urlOriginal,
      parametros: partes,
      motivo:
        "Ambiente da NFC-e inválido.",
    };
  }

  const tipoEmissao =
    obterTipoEmissao(
      versaoQr,
      partes.length
    );

  if (!tipoEmissao) {
    return {
      ehNfce: false,
      urlOriginal,
      parametros: partes,
      motivo:
        "Quantidade de campos do QR Code incompatível com a versão informada.",
    };
  }

  if (
    tipoEmissao === "CONTINGENCIA"
  ) {
    const diaEmissao =
      lerDiaEmissao(
        partes[3] ?? ""
      );

    const valorTotal =
      lerValorTotal(
        partes[4] ?? ""
      );

    if (
      diaEmissao === undefined ||
      valorTotal === undefined
    ) {
      return {
        ehNfce: false,
        urlOriginal,
        parametros: partes,
        motivo:
          "Dia de emissão ou valor total do QR Code de contingência inválido.",
      };
    }

    return {
      ehNfce: true,
      urlOriginal,
      chaveAcesso,
      dadosChave:
        extrairDadosChave(
          chaveAcesso
        ),
      versaoQr,
      ambiente,
      tipoEmissao,
      diaEmissao,
      valorTotal,
      parametros: partes,
    };
  }

  return {
    ehNfce: true,
    urlOriginal,
    chaveAcesso,
    dadosChave:
      extrairDadosChave(
        chaveAcesso
      ),
    versaoQr,
    ambiente,
    tipoEmissao,
    parametros: partes,
  };
}
