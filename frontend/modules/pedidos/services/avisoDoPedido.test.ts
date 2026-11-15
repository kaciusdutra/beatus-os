import { avisoParaMudanca, canalDoAviso, eventoDaSituacao, textoDoAviso } from "./avisoDoPedido";

let total = 0;

function verificar(condicao: boolean, descricao: string) {
  total += 1;

  if (!condicao) {
    throw new Error(`Falhou: ${descricao}`);
  }
}

verificar(eventoDaSituacao("EM_PREPARO") === "EM_PREPARO", "em preparo avisa");
verificar(eventoDaSituacao("EM_ROTA") === "A_CAMINHO", "em rota vira a caminho");
verificar(eventoDaSituacao("ENTREGUE") === "ENTREGUE", "entregue avisa");
verificar(eventoDaSituacao("PRONTO") === undefined && eventoDaSituacao("NOVO") === undefined && eventoDaSituacao("CANCELADO") === undefined, "pronto, novo e cancelado não avisam");

verificar(canalDoAviso("WHATSAPP") === "WHATSAPP" && canalDoAviso("CARDAPIO_ONLINE") === "SITE", "canais próprios");
verificar(canalDoAviso("IFOOD") === undefined && canalDoAviso("BALCAO") === undefined && canalDoAviso("PDV") === undefined, "outros canais não recebem aviso");

verificar(textoDoAviso("EM_PREPARO", "101", "SITE").includes("nº 101") && textoDoAviso("EM_PREPARO", "101", "SITE").includes("em preparo"), "texto em preparo");
verificar(textoDoAviso("A_CAMINHO", "101", "WHATSAPP").includes("a caminho"), "texto a caminho");
verificar(textoDoAviso("ENTREGUE", "101", "WHATSAPP").includes("Deu tudo certo?"), "entregue no WhatsApp pergunta como foi");
verificar(!textoDoAviso("ENTREGUE", "101", "SITE").includes("?"), "entregue no site não pergunta");

const aviso = avisoParaMudanca({ novaSituacao: "EM_ROTA", canalDoPedido: "WHATSAPP", numero: "7" });

verificar(aviso?.evento === "A_CAMINHO" && aviso.canalDoAviso === "WHATSAPP" && aviso.texto.includes("nº 7"), "aviso para mudança válida");
verificar(avisoParaMudanca({ novaSituacao: "EM_ROTA", canalDoPedido: "IFOOD", numero: "7" }) === undefined, "marketplace não gera aviso");
verificar(avisoParaMudanca({ novaSituacao: "PRONTO", canalDoPedido: "WHATSAPP", numero: "7" }) === undefined, "pronto não gera aviso");

console.log(`[OK] avisoDoPedido: ${total} verificações`);
