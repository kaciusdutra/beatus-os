import { caminhoDoQr, interpretarQr, linkDoQr } from "./qr";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const ID = "3f2b8c1e-9a47-4d6b-8e21-5c0d7a9b1f34";

verificar(caminhoDoQr("insumo", ID) === `/q/insumo/${ID}`, "caminho do insumo");
verificar(linkDoQr("https://beatus.exemplo.com/", "lote", ID) === `https://beatus.exemplo.com/q/lote/${ID}`, "barra do fim não duplica");
verificar(linkDoQr("", "lote", ID) === `/q/lote/${ID}`, "sem origem vira caminho");

// Ida e volta, em qualquer endereço.
for (const origem of ["", "http://localhost:3000", "https://beatus.exemplo.com", "https://192.168.0.10:3000/"]) {
  const lido = interpretarQr(linkDoQr(origem, "insumo", ID));

  verificar(lido?.tipo === "insumo" && lido.id === ID, `ida e volta com origem "${origem}"`);
}

verificar(interpretarQr(`  https://x.com/q/lote/${ID}?a=1  `)?.tipo === "lote", "com espaços e parâmetros");
verificar(interpretarQr(`https://x.com/q/lote/${ID}#topo`)?.id === ID, "com âncora");

// O que não é do Beatus.
verificar(interpretarQr("") === null, "vazio");
verificar(interpretarQr("https://www.sefaz.am.gov.br/nfce?p=12345") === null, "QR de NFC-e");
verificar(interpretarQr("00020126580014br.gov.bcb.pix") === null, "QR do Pix");
verificar(interpretarQr("/q/outro/12345678") === null, "tipo desconhecido");
verificar(interpretarQr("/q/insumo/curto") === null, "id curto demais");
verificar(interpretarQr(`/q/insumo/${ID}/extra`)?.id === ID, "caminho com sufixo ainda acha o id");
verificar(interpretarQr("/q/insumo/abc def ghi jkl") === null, "id com espaço");

console.log(`✅ Testes do QR passaram (${verificacoes} verificações).`);
