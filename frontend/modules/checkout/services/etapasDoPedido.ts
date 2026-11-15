// As etapas que o cliente enxerga no acompanhamento do pedido. Vêm da situação real do
// pedido na Cozinha/Entrega; o site só traduz para uma linguagem simples.

export type SituacaoDoPedido = "NOVO" | "EM_PREPARO" | "PRONTO" | "EM_ROTA" | "ENTREGUE" | "CANCELADO";

export const SITUACOES_DO_PEDIDO: SituacaoDoPedido[] = ["NOVO", "EM_PREPARO", "PRONTO", "EM_ROTA", "ENTREGUE", "CANCELADO"];

export function situacaoValida(valor: unknown): SituacaoDoPedido | undefined {
  return SITUACOES_DO_PEDIDO.find((situacao) => situacao === valor);
}

export interface EtapaDoPedido {
  situacao: Exclude<SituacaoDoPedido, "CANCELADO">;
  rotulo: string;
  estado: "feita" | "atual" | "futura";
}

const ETAPAS: { situacao: EtapaDoPedido["situacao"]; rotulo: string }[] = [
  { situacao: "NOVO", rotulo: "Pedido recebido" },
  { situacao: "EM_PREPARO", rotulo: "Em preparo" },
  { situacao: "PRONTO", rotulo: "Pronto" },
  { situacao: "EM_ROTA", rotulo: "A caminho" },
  { situacao: "ENTREGUE", rotulo: "Entregue" },
];

// Cancelado não tem linha do tempo: devolve lista vazia e a tela mostra o aviso.
export function etapasDoPedido(situacao: SituacaoDoPedido): EtapaDoPedido[] {
  if (situacao === "CANCELADO") {
    return [];
  }

  const posicao = ETAPAS.findIndex((etapa) => etapa.situacao === situacao);

  return ETAPAS.map((etapa, indice) => ({
    ...etapa,
    // A última etapa (entregue) já é o fim: aparece como feita, não como "atual".
    estado: indice < posicao || (indice === posicao && situacao === "ENTREGUE") ? "feita" : indice === posicao ? "atual" : "futura",
  }));
}

export function mensagemDaSituacao(situacao: SituacaoDoPedido, numero?: string): string {
  const nome = numero ? `Seu pedido nº ${numero}` : "Seu pedido";

  switch (situacao) {
    case "NOVO":
      return `${nome} foi recebido e já está na fila da cozinha.`;
    case "EM_PREPARO":
      return `${nome} está em preparo.`;
    case "PRONTO":
      return `${nome} está pronto e logo sai para a entrega.`;
    case "EM_ROTA":
      return `${nome} saiu para a entrega e está a caminho.`;
    case "ENTREGUE":
      return `${nome} foi entregue. Bom apetite!`;
    case "CANCELADO":
      return `${nome} foi cancelado. Se tiver dúvida, fale com a gente.`;
  }
}

// Enquanto não terminou, a tela continua conferindo.
export function pedidoEmAndamento(situacao: SituacaoDoPedido | undefined): boolean {
  return situacao !== undefined && situacao !== "ENTREGUE" && situacao !== "CANCELADO";
}
