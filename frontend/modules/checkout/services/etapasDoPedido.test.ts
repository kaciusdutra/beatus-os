import { etapasDoPedido, mensagemDaSituacao, pedidoEmAndamento, situacaoValida } from "./etapasDoPedido";

let total = 0;

function verificar(condicao: boolean, descricao: string) {
  total += 1;

  if (!condicao) {
    throw new Error(`Falhou: ${descricao}`);
  }
}

const estados = (situacao: Parameters<typeof etapasDoPedido>[0]) => etapasDoPedido(situacao).map((etapa) => etapa.estado).join(",");

verificar(estados("NOVO") === "atual,futura,futura,futura,futura", "novo: só a primeira é atual");
verificar(estados("EM_PREPARO") === "feita,atual,futura,futura,futura", "em preparo");
verificar(estados("PRONTO") === "feita,feita,atual,futura,futura", "pronto");
verificar(estados("EM_ROTA") === "feita,feita,feita,atual,futura", "a caminho");
verificar(estados("ENTREGUE") === "feita,feita,feita,feita,feita", "entregue: tudo feito");
verificar(etapasDoPedido("CANCELADO").length === 0, "cancelado não tem linha do tempo");

verificar(etapasDoPedido("NOVO")[0].rotulo === "Pedido recebido" && etapasDoPedido("EM_ROTA")[3].rotulo === "A caminho", "rótulos");

verificar(mensagemDaSituacao("EM_PREPARO", "101") === "Seu pedido nº 101 está em preparo.", "mensagem com número");
verificar(mensagemDaSituacao("ENTREGUE").startsWith("Seu pedido foi entregue"), "mensagem sem número");
verificar(mensagemDaSituacao("CANCELADO").includes("cancelado"), "mensagem de cancelado");

verificar(pedidoEmAndamento("NOVO") && pedidoEmAndamento("EM_ROTA"), "em andamento");
verificar(!pedidoEmAndamento("ENTREGUE") && !pedidoEmAndamento("CANCELADO") && !pedidoEmAndamento(undefined), "terminou ou sem pedido");

verificar(situacaoValida("EM_ROTA") === "EM_ROTA" && situacaoValida("INVENTADO") === undefined && situacaoValida(undefined) === undefined, "situação válida");

console.log(`[OK] etapasDoPedido: ${total} verificações`);
