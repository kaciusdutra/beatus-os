import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import {
  ErroRespostaLeituraFoto,
  estimarCustoLeituraFoto,
  interpretarRespostaLeituraFoto,
  type LeituraFotoDocumento,
  type PrecosLeituraFoto,
  type UsoLeituraFoto,
} from "../documentos/leituraFotoDocumento";

// Leitura de nota, cupom ou recibo (inclusive manuscrito) por foto, usando a
// IA da Anthropic. A chave fica só no servidor (.env: ANTHROPIC_API_KEY) e
// nunca é impressa nem enviada ao navegador. Sem a chave, a leitura fica
// "não configurada" e o lançamento manual segue funcionando.

// Modelo padrão: Sonnet (equilíbrio entre custo e qualidade para ler notas).
// Pode ser trocado pelo .env sem mexer no código (ANTHROPIC_MODELO).
const MODELO_PADRAO = "claude-sonnet-5-5";

const TEMPO_LIMITE_MS = 120_000;

const MAX_TOKENS_SAIDA = 8000;

export type TipoImagemLeitura =
  | "image/jpeg"
  | "image/png"
  | "image/webp";

export interface ImagemLeitura {
  base64: string;
  tipo: TipoImagemLeitura;
}

export interface ResultadoLeituraFoto {
  leitura: LeituraFotoDocumento;
  modelo: string;
  uso: UsoLeituraFoto;
  // Em reais; só vem quando os preços foram configurados no .env.
  custoEstimadoReais?: number;
}

export class ErroLeituraFoto extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
    readonly codigo:
      | "NAO_CONFIGURADA"
      | "CHAVE_RECUSADA"
      | "LIMITE"
      | "INDISPONIVEL"
      | "RECUSADA"
      | "RESPOSTA_INVALIDA"
  ) {
    super(mensagem);
  }
}

const INSTRUCOES = `Você lê fotos de documentos de compra de um restaurante brasileiro: nota fiscal (NF-e ou NFC-e, DANFE), cupom fiscal, recibo e comprovante, impressos ou escritos à mão.

Leia o documento da foto e responda SOMENTE com um objeto JSON, sem texto antes ou depois, neste formato:

{
  "tipoDocumento": "NOTA_FISCAL" | "RECIBO" | "COMPROVANTE" | "OUTRO",
  "manuscrito": true se o documento é escrito à mão, senão false,
  "emitente": {
    "nome": "nome ou razão social de quem vendeu (o emitente), ou null",
    "documento": "CNPJ ou CPF do emitente, só se estiver escrito no documento, ou null",
    "telefone": "telefone do emitente ou null"
  },
  "numeroDocumento": "número da nota ou do recibo, ou null",
  "serie": "série, ou null",
  "chaveAcesso": "chave de acesso de 44 dígitos, ou null",
  "dataDocumento": "data de emissão no formato AAAA-MM-DD, ou null",
  "itens": [
    {
      "descricao": "descrição exatamente como está escrita no documento",
      "codigo": "código do produto no fornecedor, ou null",
      "unidade": "kg, un, pct, cx, l etc., ou null se não estiver escrita",
      "quantidade": número,
      "valorUnitario": número em reais, ou null se não estiver escrito,
      "valorTotal": número em reais do item, ou null se não estiver escrito,
      "desconto": número em reais, ou null,
      "incerto": true se você não tem certeza de algum dado deste item,
      "motivoIncerteza": "o que está duvidoso (ex.: o 3 pode ser um 8), ou null"
    }
  ],
  "desconto": desconto geral do documento em reais, ou null,
  "frete": frete em reais, ou null,
  "valorTotal": total pago do documento em reais, ou null,
  "camposIncertos": lista com os campos de cabeçalho em dúvida, escolhendo entre: "emitente", "documento", "numero", "serie", "chave", "data", "desconto", "frete", "total"
}

Regras:
- Copie o que está escrito. Nunca invente nem complete dados que você não consegue ler: use null e marque "incerto".
- Números em formato JSON (ponto decimal, sem "R$"). Quantidades com decimais usam ponto (2.5).
- Em letra manuscrita, se um número ou palavra puder ser lido de mais de um jeito, escolha a leitura mais provável, marque "incerto" no item e explique em "motivoIncerteza".
- Não inclua linhas que não são produtos (subtotal, total, troco, forma de pagamento, impostos) em "itens".
- Se a foto não for um documento de compra ou estiver ilegível, devolva "itens": [] e deixe o resto null.`;

function numeroDoAmbiente(
  nome: string
): number | undefined {
  const bruto = process.env[nome]?.trim();

  if (!bruto) {
    return undefined;
  }

  const convertido = Number(
    bruto.replace(",", ".")
  );

  return Number.isFinite(convertido)
    ? convertido
    : undefined;
}

// Preços em reais por milhão de tokens, informados pelo usuário no .env
// depois de avaliar o custo. Nenhum preço fica no código.
function precosDoAmbiente(): PrecosLeituraFoto {
  return {
    entradaPorMilhao: numeroDoAmbiente(
      "ANTHROPIC_PRECO_ENTRADA_REAIS_MILHAO"
    ),
    saidaPorMilhao: numeroDoAmbiente(
      "ANTHROPIC_PRECO_SAIDA_REAIS_MILHAO"
    ),
  };
}

export function leituraFotoConfigurada(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY?.trim()
  );
}

export async function lerDocumentoPorFoto(
  imagem: ImagemLeitura,
  tipoDocumentoInformado?: string
): Promise<ResultadoLeituraFoto> {
  const chave =
    process.env.ANTHROPIC_API_KEY?.trim();

  if (!chave) {
    throw new ErroLeituraFoto(
      "A leitura por IA ainda não está configurada neste computador. Digite os itens manualmente.",
      503,
      "NAO_CONFIGURADA"
    );
  }

  const modelo =
    process.env.ANTHROPIC_MODELO?.trim() ||
    MODELO_PADRAO;

  const client = new Anthropic({
    apiKey: chave,
    timeout: TEMPO_LIMITE_MS,
    maxRetries: 2,
  });

  const dica = tipoDocumentoInformado
    ? `\n\nA pessoa que está lançando informou que o documento é do tipo ${tipoDocumentoInformado}. Confirme pelo que você vê na foto.`
    : "";

  let resposta: Anthropic.Message;

  try {
    resposta = await client.messages.create({
      model: modelo,
      max_tokens: MAX_TOKENS_SAIDA,
      system: INSTRUCOES,
      output_config: { effort: "medium" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imagem.tipo,
                data: imagem.base64,
              },
            },
            {
              type: "text",
              text: `Leia este documento e devolva o JSON.${dica}`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new ErroLeituraFoto(
        "A chave da Anthropic foi recusada. Confira o valor de ANTHROPIC_API_KEY no .env.",
        503,
        "CHAVE_RECUSADA"
      );
    }

    if (error instanceof Anthropic.RateLimitError) {
      throw new ErroLeituraFoto(
        "Muitas leituras em sequência. Espere um minuto e tente de novo.",
        429,
        "LIMITE"
      );
    }

    if (error instanceof Anthropic.APIConnectionError) {
      throw new ErroLeituraFoto(
        "Não foi possível falar com a IA agora. Confira a internet ou digite os itens manualmente.",
        503,
        "INDISPONIVEL"
      );
    }

    console.error(
      "ERRO NA LEITURA POR FOTO:",
      error instanceof Error
        ? error.message
        : error
    );

    throw new ErroLeituraFoto(
      "A IA não conseguiu ler o documento agora. Tente de novo ou digite os itens manualmente.",
      502,
      "INDISPONIVEL"
    );
  }

  if (resposta.stop_reason === "refusal") {
    throw new ErroLeituraFoto(
      "A IA recusou ler esta imagem. Tente outra foto ou digite os itens manualmente.",
      422,
      "RECUSADA"
    );
  }

  if (resposta.stop_reason === "max_tokens") {
    throw new ErroLeituraFoto(
      "O documento tem itens demais para ler de uma vez. Fotografe por partes ou digite os itens.",
      422,
      "RESPOSTA_INVALIDA"
    );
  }

  const textoResposta = resposta.content
    .filter(
      (bloco): bloco is Anthropic.TextBlock =>
        bloco.type === "text"
    )
    .map((bloco) => bloco.text)
    .join("\n");

  let leitura: LeituraFotoDocumento;

  try {
    leitura =
      interpretarRespostaLeituraFoto(
        textoResposta
      );
  } catch (error) {
    if (error instanceof ErroRespostaLeituraFoto) {
      throw new ErroLeituraFoto(
        `${error.message} Tente outra foto ou digite os itens manualmente.`,
        502,
        "RESPOSTA_INVALIDA"
      );
    }

    throw error;
  }

  const uso: UsoLeituraFoto = {
    tokensEntrada:
      resposta.usage.input_tokens +
      (resposta.usage
        .cache_creation_input_tokens ?? 0) +
      (resposta.usage
        .cache_read_input_tokens ?? 0),
    tokensSaida: resposta.usage.output_tokens,
  };

  const custoEstimadoReais =
    estimarCustoLeituraFoto(
      uso,
      precosDoAmbiente()
    );

  // Registro para avaliar o custo de cada foto (sem a imagem nem a chave).
  console.info("LEITURA POR FOTO:", {
    modelo,
    tokensEntrada: uso.tokensEntrada,
    tokensSaida: uso.tokensSaida,
    custoEstimadoReais,
  });

  return {
    leitura,
    modelo,
    uso,
    custoEstimadoReais,
  };
}
