import "server-only";

import {
  cnpjValido,
  somenteDigitos,
} from "../../domain/documentoFornecedor";

// Consulta pública de CNPJ (BrasilAPI, dados abertos da Receita Federal).
// Só o CNPJ sai do sistema. Serve para preencher o cadastro;
// o cadastro nunca depende dela.

const URL_BRASIL_API =
  "https://brasilapi.com.br/api/cnpj/v1/";

const TEMPO_LIMITE_MS = 8000;

export interface DadosCnpjPublico {
  cnpj: string;

  razaoSocial: string;

  nomeFantasia?: string;

  telefone?: string;

  email?: string;

  // Ex.: "ATIVA", "BAIXADA", "INAPTA".
  situacaoCadastral?: string;

  ativa: boolean;

  municipio?: string;

  uf?: string;
}

export class ErroConsultaCnpj extends Error {
  constructor(
    mensagem: string,
    readonly status: number
  ) {
    super(mensagem);
  }
}

function texto(
  valor: unknown
): string | undefined {
  return typeof valor === "string" &&
    valor.trim()
    ? valor.trim()
    : undefined;
}

export async function consultarCnpjPublico(
  cnpjInformado: string
): Promise<DadosCnpjPublico> {
  const cnpj = somenteDigitos(cnpjInformado);

  if (!cnpjValido(cnpj)) {
    throw new ErroConsultaCnpj(
      "CNPJ inválido. Confira os números.",
      400
    );
  }

  let resposta: Response;

  try {
    resposta = await fetch(
      `${URL_BRASIL_API}${cnpj}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(
          TEMPO_LIMITE_MS
        ),
        headers: {
          Accept: "application/json",
          // Sem identificação, a BrasilAPI responde 403.
          "User-Agent": "BeatusOS/1.0",
        },
      }
    );
  } catch {
    throw new ErroConsultaCnpj(
      "Não foi possível consultar o CNPJ agora. Preencha os dados manualmente.",
      503
    );
  }

  if (resposta.status === 404) {
    throw new ErroConsultaCnpj(
      "CNPJ não encontrado na Receita Federal.",
      404
    );
  }

  if (!resposta.ok) {
    throw new ErroConsultaCnpj(
      "Não foi possível consultar o CNPJ agora. Preencha os dados manualmente.",
      503
    );
  }

  const dados =
    (await resposta.json()) as Record<
      string,
      unknown
    >;

  const razaoSocial = texto(
    dados.razao_social
  );

  if (!razaoSocial) {
    throw new ErroConsultaCnpj(
      "A consulta não trouxe a razão social. Preencha os dados manualmente.",
      502
    );
  }

  const situacaoCadastral = texto(
    dados.descricao_situacao_cadastral
  );

  return {
    cnpj,
    razaoSocial,
    nomeFantasia: texto(dados.nome_fantasia),
    telefone: texto(dados.ddd_telefone_1)
      ? somenteDigitos(
          texto(dados.ddd_telefone_1)
        )
      : undefined,
    email: texto(dados.email)?.toLowerCase(),
    situacaoCadastral,
    ativa:
      situacaoCadastral?.toUpperCase() ===
      "ATIVA",
    municipio: texto(dados.municipio),
    uf: texto(dados.uf),
  };
}
