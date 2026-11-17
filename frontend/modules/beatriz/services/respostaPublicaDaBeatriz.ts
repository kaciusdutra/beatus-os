import type { RascunhoDePedido, RespostaDaBeatriz } from "../types/beatriz";

// O que o chat do site recebe. Só o que o visitante pode ver: a fala, o pedido anotado e o que fazer em seguida.
// Nada de uso da IA, modelo, avisos do sistema, motivo para a equipe nem memória de cliente.
export interface RespostaPublicaDaBeatriz {
  resposta: string;
  rascunho: RascunhoDePedido;
  // O cliente confirmou o pedido e dá para pagar: o chat mostra o botão do pagamento.
  linkDePagamento?: string;
  // A conversa precisa de uma pessoa (ou o pedido não cabe no link): o chat mostra o botão do WhatsApp.
  chamarPessoa: boolean;
}

// Pedido com adicionais ainda não vai no link de pagamento (regra 26.8): é uma pessoa que lança.
export function respostaPublicaDaBeatriz(resposta: RespostaDaBeatriz, montarLink: (itens: { produtoId: string; quantidade: number; observacao?: string }[]) => string): RespostaPublicaDaBeatriz {
  const comAdicionais = resposta.rascunho.itens.some((item) => item.adicionais.length > 0);

  const podePagar = resposta.pedidoConfirmadoPeloCliente && resposta.rascunho.itens.length > 0 && !resposta.precisaDeHumano && !comAdicionais;

  return {
    resposta: resposta.resposta,
    rascunho: resposta.rascunho,
    linkDePagamento: podePagar
      ? montarLink(resposta.rascunho.itens.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade, observacao: item.observacao })))
      : undefined,
    chamarPessoa: resposta.precisaDeHumano || (resposta.pedidoConfirmadoPeloCliente && comAdicionais),
  };
}
