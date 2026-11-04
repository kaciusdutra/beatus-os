import {
  interpretarQrNfce,
} from "./interpretarQrNfce";

const CHAVE_NFCE =
  "13260906057223044209650110000813641111025235";

const CHAVE_MODELO_55 =
  "13260906057223044209550110000813641111025235";

const HASH_FICTICIO =
  "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2";

const URL_BASE =
  "https://exemplo.com/nfce?p=";

let verificacoes = 0;

function verificar(
  condicao: boolean,
  mensagem: string
): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(
      `Falha: ${mensagem}`
    );
  }
}

function executarTestes(): void {
  // --------------------------------------------------
  // VERSÃO 3 ONLINE (PRODUÇÃO)
  // --------------------------------------------------

  const v3Online =
    interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|3|1`
    );

  verificar(
    v3Online.ehNfce,
    "QR v3 online não foi aceito como NFC-e."
  );

  verificar(
    v3Online.chaveAcesso ===
      CHAVE_NFCE,
    "chave de acesso não foi extraída corretamente (v3)."
  );

  verificar(
    v3Online.versaoQr === 3,
    "versão do QR não foi identificada como 3."
  );

  verificar(
    v3Online.ambiente ===
      "PRODUCAO",
    "ambiente não foi identificado como PRODUÇÃO."
  );

  verificar(
    v3Online.tipoEmissao ===
      "ONLINE",
    "QR v3 com 3 campos não foi identificado como ONLINE."
  );

  // --------------------------------------------------
  // DADOS EXTRAÍDOS DA CHAVE
  // --------------------------------------------------

  verificar(
    v3Online.dadosChave?.codigoUf ===
      "13",
    "UF não foi extraída da chave."
  );

  verificar(
    v3Online.dadosChave
      ?.anoMesEmissao === "2026-09",
    "ano e mês não foram extraídos da chave."
  );

  verificar(
    v3Online.dadosChave
      ?.documentoEmitente ===
      "06057223044209",
    "CNPJ do emitente não foi extraído da chave."
  );

  verificar(
    v3Online.dadosChave?.serie ===
      "11",
    "série não foi extraída sem zeros à esquerda."
  );

  verificar(
    v3Online.dadosChave?.numero ===
      "81364",
    "número não foi extraído sem zeros à esquerda."
  );

  // --------------------------------------------------
  // VERSÃO 2 ONLINE (A MAIS COMUM HOJE)
  // --------------------------------------------------

  const v2Online =
    interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|2|1|1|${HASH_FICTICIO}`
    );

  verificar(
    v2Online.ehNfce,
    "QR v2 online não foi aceito como NFC-e."
  );

  verificar(
    v2Online.versaoQr === 2,
    "versão do QR não foi identificada como 2."
  );

  verificar(
    v2Online.chaveAcesso ===
      CHAVE_NFCE,
    "chave de acesso não foi extraída corretamente (v2)."
  );

  verificar(
    v2Online.tipoEmissao ===
      "ONLINE",
    "QR v2 com 5 campos não foi identificado como ONLINE."
  );

  // --------------------------------------------------
  // VERSÃO 2 CONTINGÊNCIA
  // --------------------------------------------------

  const v2Contingencia =
    interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|2|1|15|125.90|6A4B3C2D1E|1|${HASH_FICTICIO}`
    );

  verificar(
    v2Contingencia.ehNfce,
    "QR v2 de contingência não foi aceito."
  );

  verificar(
    v2Contingencia.tipoEmissao ===
      "CONTINGENCIA",
    "QR v2 com 8 campos não foi identificado como CONTINGÊNCIA."
  );

  verificar(
    v2Contingencia.dadosChave
      ?.documentoEmitente ===
      "06057223044209",
    "CNPJ do emitente não foi extraído na contingência."
  );

  verificar(
    v2Contingencia.diaEmissao === 15,
    "dia de emissão não foi extraído (v2 contingência)."
  );

  verificar(
    v2Contingencia.valorTotal ===
      125.9,
    "valor total não foi extraído (v2 contingência)."
  );

  // --------------------------------------------------
  // VERSÃO 3 CONTINGÊNCIA
  // --------------------------------------------------

  const v3Contingencia =
    interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|3|1|7|48.50|||ASSINATURAFICTICIA`
    );

  verificar(
    v3Contingencia.ehNfce,
    "QR v3 de contingência não foi aceito."
  );

  verificar(
    v3Contingencia.tipoEmissao ===
      "CONTINGENCIA",
    "QR v3 com 8 campos não foi identificado como CONTINGÊNCIA."
  );

  verificar(
    v3Contingencia.diaEmissao === 7 &&
      v3Contingencia.valorTotal ===
        48.5,
    "dia ou valor não foram extraídos (v3 contingência)."
  );

  // --------------------------------------------------
  // CONTINGÊNCIA COM DIA OU VALOR INVÁLIDO
  // --------------------------------------------------

  verificar(
    !interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|2|1|45|125.90|6A4B|1|${HASH_FICTICIO}`
    ).ehNfce,
    "contingência com dia 45 foi aceita."
  );

  verificar(
    !interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|2|1|15|12,50|6A4B|1|${HASH_FICTICIO}`
    ).ehNfce,
    "contingência com valor em vírgula foi aceita."
  );

  // --------------------------------------------------
  // QUANTIDADE DE CAMPOS INCOMPATÍVEL
  // --------------------------------------------------

  verificar(
    !interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|2|1`
    ).ehNfce,
    "QR v2 com só 3 campos foi aceito."
  );

  verificar(
    !interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|3|1|1|${HASH_FICTICIO}`
    ).ehNfce,
    "QR v3 com 5 campos foi aceito."
  );

  // --------------------------------------------------
  // PARÂMETRO P EM MAIÚSCULA
  // --------------------------------------------------

  const parametroMaiusculo =
    interpretarQrNfce(
      `https://exemplo.com/nfce?P=${CHAVE_NFCE}|3|1`
    );

  verificar(
    parametroMaiusculo.ehNfce,
    "parâmetro P em maiúscula não foi aceito."
  );

  verificar(
    parametroMaiusculo.chaveAcesso ===
      CHAVE_NFCE,
    "chave não foi extraída com P maiúsculo."
  );

  // --------------------------------------------------
  // CONTEÚDO VAZIO
  // --------------------------------------------------

  verificar(
    interpretarQrNfce("")
      .dadosChave === undefined,
    "QR inválido retornou dados da chave."
  );

  verificar(
    !interpretarQrNfce("")
      .ehNfce,
    "conteúdo vazio foi aceito como NFC-e."
  );

  // --------------------------------------------------
  // QR SEM PARÂMETRO P
  // --------------------------------------------------

  verificar(
    !interpretarQrNfce(
      "https://exemplo.com/nfce"
    ).ehNfce,
    "URL sem parâmetro P foi aceita como NFC-e."
  );

  verificar(
    !interpretarQrNfce(
      "https://exemplo.com/nfce?q=123"
    ).ehNfce,
    "URL com outro parâmetro foi aceita como NFC-e."
  );

  // --------------------------------------------------
  // CHAVE INVÁLIDA
  // --------------------------------------------------

  verificar(
    !interpretarQrNfce(
      `${URL_BASE}123|3|1`
    ).ehNfce,
    "chave com menos de 44 dígitos foi aceita."
  );

  // --------------------------------------------------
  // MODELO 55 (NF-e) NÃO É NFC-e
  // --------------------------------------------------

  verificar(
    !interpretarQrNfce(
      `${URL_BASE}${CHAVE_MODELO_55}|3|1`
    ).ehNfce,
    "chave de NF-e modelo 55 foi aceita como NFC-e."
  );

  // --------------------------------------------------
  // VERSÃO NÃO SUPORTADA
  // --------------------------------------------------

  verificar(
    !interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|1|1`
    ).ehNfce,
    "versão 1 de QR foi aceita."
  );

  verificar(
    !interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|4|1`
    ).ehNfce,
    "versão 4 de QR foi aceita."
  );

  // --------------------------------------------------
  // AMBIENTE HOMOLOGAÇÃO
  // --------------------------------------------------

  const homologacao =
    interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|3|2`
    );

  verificar(
    homologacao.ehNfce,
    "QR de homologação não foi aceito."
  );

  verificar(
    homologacao.ambiente ===
      "HOMOLOGACAO",
    "ambiente de homologação não foi identificado."
  );

  // --------------------------------------------------
  // AMBIENTE INVÁLIDO
  // --------------------------------------------------

  verificar(
    !interpretarQrNfce(
      `${URL_BASE}${CHAVE_NFCE}|3|9`
    ).ehNfce,
    "ambiente inválido foi aceito."
  );

  console.log(
    `✅ interpretarQrNfce: ${verificacoes} verificações passaram.`
  );
}

executarTestes();
