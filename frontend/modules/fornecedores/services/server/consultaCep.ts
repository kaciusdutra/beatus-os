import "server-only";

import {
  somenteDigitos,
} from "../../domain/documentoFornecedor";

// Consulta pública de CEP (BrasilAPI). Só o CEP sai do sistema. Serve
// para preencher endereços; o cadastro nunca depende dela. A mesma rota
// atende fornecedores e, depois, clientes.

const URL_BRASIL_API =
  "https://brasilapi.com.br/api/cep/v2/";

const TEMPO_LIMITE_MS = 8000;

export interface EnderecoPorCep {
  cep: string;

  logradouro?: string;

  bairro?: string;

  municipio: string;

  uf: string;
}

export class ErroConsultaCep extends Error {
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

export async function consultarCep(
  cepInformado: string
): Promise<EnderecoPorCep> {
  const cep = somenteDigitos(cepInformado);

  if (cep.length !== 8) {
    throw new ErroConsultaCep(
      "CEP inválido. O CEP tem 8 números.",
      400
    );
  }

  let resposta: Response;

  try {
    resposta = await fetch(
      `${URL_BRASIL_API}${cep}`,
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
    throw new ErroConsultaCep(
      "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.",
      503
    );
  }

  if (resposta.status === 404) {
    throw new ErroConsultaCep(
      "CEP não encontrado. Confira os números ou preencha o endereço manualmente.",
      404
    );
  }

  if (!resposta.ok) {
    throw new ErroConsultaCep(
      "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.",
      503
    );
  }

  const dados =
    (await resposta.json()) as Record<
      string,
      unknown
    >;

  const municipio = texto(dados.city);
  const uf = texto(dados.state);

  if (!municipio || !uf) {
    throw new ErroConsultaCep(
      "A consulta não trouxe a cidade. Preencha o endereço manualmente.",
      502
    );
  }

  return {
    cep,
    // CEP de cidade pequena pode não ter rua nem bairro.
    logradouro: texto(dados.street),
    bairro: texto(dados.neighborhood),
    municipio,
    uf,
  };
}
