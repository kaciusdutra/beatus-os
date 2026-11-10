import {
  chaveAcessoValida,
  diferencaTotalNota,
  interpretarXmlNfe,
} from "./interpretarXmlNfe";

// XMLs de exemplo no layout 4.00 (dados fictícios).
const CHAVE_NFE =
  "13261111222333000181550010000123451123456780";

const CHAVE_NFCE =
  "13261111222333000181650010000007771123456786";

let verificacoes = 0;

function verificar(
  condicao: boolean,
  mensagem: string
): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function montarNfe(opcoes?: {
  chave?: string;
  modelo?: string;
  comProtocolo?: boolean;
  cStat?: string;
  vST?: string;
  vNF?: string;
}): string {
  const chave = opcoes?.chave ?? CHAVE_NFE;

  const nfe = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chave}" versao="4.00">
    <ide>
      <cUF>13</cUF><nNF>12345</nNF><serie>1</serie>
      <mod>${opcoes?.modelo ?? "55"}</mod>
      <dhEmi>2026-11-05T10:30:00-04:00</dhEmi>
      <tpAmb>1</tpAmb>
    </ide>
    <emit>
      <CNPJ>11222333000181</CNPJ>
      <xNome>DISTRIBUIDORA DE ALIMENTOS &amp; CIA LTDA</xNome>
      <xFant>Distribuidora Norte</xFant>
      <enderEmit>
        <xLgr>RUA DAS FLORES</xLgr><nro>100</nro><xCpl>GALPAO 2</xCpl>
        <xBairro>CENTRO</xBairro><cMun>1302603</cMun><xMun>MANAUS</xMun>
        <UF>AM</UF><CEP>69005000</CEP><fone>9233334444</fone>
      </enderEmit>
      <IE>041234567</IE>
    </emit>
    <det nItem="1">
      <prod>
        <cProd>QJ-001</cProd><cEAN>7891234567895</cEAN>
        <xProd>QUEIJO COALHO DE BÚFALA KG</xProd>
        <NCM>04069090</NCM><CFOP>5102</CFOP>
        <uCom>KG</uCom><qCom>2.5000</qCom><vUnCom>48.9000000000</vUnCom>
        <vProd>122.25</vProd><vDesc>2.25</vDesc>
        <rastro><nLote>L2611</nLote><qLote>2.5</qLote><dFab>2026-10-30</dFab><dVal>2026-12-15</dVal></rastro>
      </prod>
    </det>
    <det nItem="2">
      <prod>
        <cProd>PB-06</cProd><cEAN>SEM GTIN</cEAN>
        <xProd><![CDATA[PÃO BRIOCHE C/ 6]]></xProd>
        <uCom>PCT</uCom><qCom>10</qCom><vUnCom>12.00</vUnCom>
        <vProd>120.00</vProd>
      </prod>
    </det>
    <total>
      <ICMSTot>
        <vProd>242.25</vProd><vDesc>2.25</vDesc><vFrete>15.00</vFrete>
        <vSeg>0.00</vSeg><vOutro>0.00</vOutro><vIPI>0.00</vIPI>
        <vST>${opcoes?.vST ?? "0.00"}</vST><vNF>${opcoes?.vNF ?? "255.00"}</vNF>
      </ICMSTot>
    </total>
  </infNFe>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo/></Signature>
</NFe>`;

  if (opcoes?.comProtocolo === false) {
    return `<?xml version="1.0" encoding="UTF-8"?>${nfe}`;
  }

  return `﻿<?xml version="1.0" encoding="UTF-8"?>
<!-- XML processado -->
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  ${nfe}
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb><chNFe>${chave}</chNFe>
      <nProt>113260000123456</nProt>
      <cStat>${opcoes?.cStat ?? "100"}</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
}

function executarTestes(): void {
  // Chave de acesso
  verificar(chaveAcessoValida(CHAVE_NFE), "chave NF-e válida");
  verificar(chaveAcessoValida(CHAVE_NFCE), "chave NFC-e válida");
  verificar(
    !chaveAcessoValida(`${CHAVE_NFE.slice(0, 43)}1`),
    "chave com dígito errado"
  );

  // NF-e processada e autorizada
  const lida = interpretarXmlNfe(montarNfe());

  if (!lida.sucesso) {
    throw new Error(`Falha: ${lida.motivo}`);
  }

  const nota = lida.nota;

  verificar(nota.chaveAcesso === CHAVE_NFE, "chave");
  verificar(nota.modelo === "55", "modelo");
  verificar(nota.numero === "12345", "número");
  verificar(nota.serie === "1", "série");
  verificar(nota.dataEmissao === "2026-11-05", "data de emissão local");
  verificar(nota.dataHoraEmissao === "2026-11-05T10:30", "hora de emissão local");
  verificar(nota.ambiente === "PRODUCAO", "ambiente");
  verificar(nota.autorizada, "autorizada");
  verificar(nota.protocolo === "113260000123456", "protocolo");

  verificar(nota.emitente.cnpj === "11222333000181", "CNPJ do emitente");
  verificar(
    nota.emitente.razaoSocial === "DISTRIBUIDORA DE ALIMENTOS & CIA LTDA",
    "razão social com entidade"
  );
  verificar(nota.emitente.nomeFantasia === "Distribuidora Norte", "fantasia");
  verificar(nota.emitente.inscricaoEstadual === "041234567", "IE");
  verificar(nota.emitente.telefone === "9233334444", "telefone");
  verificar(nota.emitente.endereco.municipio === "MANAUS", "município");
  verificar(nota.emitente.endereco.cep === "69005000", "CEP");

  verificar(nota.itens.length === 2, "dois itens");

  const [queijo, pao] = nota.itens;

  verificar(queijo.numeroItem === 1, "nItem");
  verificar(queijo.codigo === "QJ-001", "código do produto");
  verificar(queijo.ean === "7891234567895", "EAN");
  verificar(queijo.descricao === "QUEIJO COALHO DE BÚFALA KG", "descrição com acento");
  verificar(queijo.unidade === "KG", "unidade");
  verificar(queijo.quantidade === 2.5, "quantidade decimal");
  verificar(queijo.valorUnitario === 48.9, "valor unitário");
  verificar(queijo.valorProdutos === 122.25, "valor do item");
  verificar(queijo.desconto === 2.25, "desconto do item");
  verificar(queijo.lote === "L2611", "lote");
  verificar(queijo.validade === "2026-12-15", "validade");

  verificar(pao.descricao === "PÃO BRIOCHE C/ 6", "descrição em CDATA");
  verificar(pao.ean === undefined, "SEM GTIN vira vazio");
  verificar(pao.desconto === 0, "item sem desconto");
  verificar(pao.lote === undefined, "item sem lote");

  verificar(nota.totais.produtos === 242.25, "total dos produtos");
  verificar(nota.totais.frete === 15, "frete");
  verificar(nota.totais.total === 255, "total da nota");
  verificar(diferencaTotalNota(nota.totais) === 0, "sem diferença");

  // Nota com ICMS-ST: total da nota maior que o da entrada
  const comSt = interpretarXmlNfe(
    montarNfe({ vST: "8.40", vNF: "263.40" })
  );

  verificar(
    comSt.sucesso &&
      diferencaTotalNota(comSt.nota.totais) === 8.4,
    "diferença por ST"
  );

  // XML só com a nota (sem protocolo da SEFAZ)
  const semProtocolo = interpretarXmlNfe(
    montarNfe({ comProtocolo: false })
  );

  verificar(
    semProtocolo.sucesso &&
      !semProtocolo.nota.autorizada &&
      semProtocolo.nota.situacaoProtocolo === undefined,
    "sem protocolo não é autorizada"
  );

  // Protocolo de nota denegada
  const denegada = interpretarXmlNfe(
    montarNfe({ cStat: "302" })
  );

  verificar(
    denegada.sucesso &&
      !denegada.nota.autorizada &&
      Boolean(denegada.nota.situacaoProtocolo?.startsWith("302")),
    "denegada"
  );

  // NFC-e (modelo 65)
  const nfce = interpretarXmlNfe(
    montarNfe({ chave: CHAVE_NFCE, modelo: "65" })
  );

  verificar(nfce.sucesso && nfce.nota.modelo === "65", "NFC-e");

  // Prefixo de namespace (nfe:det)
  const comPrefixo = interpretarXmlNfe(
    montarNfe()
      .replace(/<(\/?)(?!\?|!)([A-Za-z])/g, "<$1nfe:$2")
  );

  verificar(
    comPrefixo.sucesso && comPrefixo.nota.itens.length === 2,
    "tags com prefixo"
  );

  // Erros
  const vazio = interpretarXmlNfe("   ");
  verificar(!vazio.sucesso, "arquivo vazio");

  const quebrado = interpretarXmlNfe("<NFe><infNFe>");
  verificar(
    !quebrado.sucesso &&
      quebrado.motivo.startsWith("O arquivo não é um XML válido"),
    "XML malformado"
  );

  const outroXml = interpretarXmlNfe(
    "<?xml version=\"1.0\"?><pedido><item/></pedido>"
  );
  verificar(
    !outroXml.sucesso && outroXml.motivo.includes("infNFe"),
    "XML que não é nota"
  );

  const chaveErrada = interpretarXmlNfe(
    montarNfe({ chave: `${CHAVE_NFE.slice(0, 43)}1` })
  );
  verificar(
    !chaveErrada.sucesso &&
      chaveErrada.motivo.includes("chave de acesso"),
    "chave inválida no XML"
  );

  const modeloErrado = interpretarXmlNfe(
    montarNfe({ modelo: "57" })
  );
  verificar(
    !modeloErrado.sucesso &&
      modeloErrado.motivo.includes("Modelo"),
    "modelo não suportado"
  );

  console.log(
    `✅ Testes do XML da NF-e passaram (${verificacoes} verificações).`
  );
}

try {
  executarTestes();
} catch (error) {
  console.error("❌ Testes do XML da NF-e falharam:");
  console.error(error);
  process.exitCode = 1;
}
