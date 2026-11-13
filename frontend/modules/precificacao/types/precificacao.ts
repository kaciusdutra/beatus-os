// Canais de venda (regra 3.2). A chave é gravada no banco.
export const CANAIS_DE_VENDA = [
  { chave: "WHATSAPP", rotulo: "WhatsApp" },
  { chave: "SITE", rotulo: "Site (cardápio online)" },
  { chave: "IFOOD", rotulo: "iFood" },
  { chave: "99FOOD", rotulo: "99Food" },
  { chave: "KEETA", rotulo: "Keeta" },
] as const;

export type CanalDeVenda = (typeof CANAIS_DE_VENDA)[number]["chave"];

export function ehCanalDeVenda(valor: unknown): valor is CanalDeVenda {
  return CANAIS_DE_VENDA.some((canal) => canal.chave === valor);
}

// Parâmetros gerais da precificação (um registro por empresa).
export interface ParametrosPrecificacao {
  pedidosMensaisEstimados: number;

  // Embutidos no preço, seja qual for a forma de pagamento (regra 4.5).
  impostoPercentual: number;

  taxaPagamentoPercentual: number;

  // R$ por pedido (sacola, guardanapo, sachê).
  embalagemPedido: number;

  // Produtos por pedido, em média.
  itensPorPedidoEstimados: number;

  // Margens mostradas lado a lado, em ordem (ex.: 20, 25, 30, 35).
  margensCenario: number[];

  // Abaixo desta margem, o preço conta como promoção.
  margemMinimaPercentual: number;

  // Meta de custo dos ingredientes sobre o preço (referência de mercado: 35%).
  cmvAlvoPercentual: number;
}

export interface CanalPrecificacaoDados {
  canal: CanalDeVenda;

  comissaoPercentual: number;

  // Taxa fixa do canal por mês (iFood: R$ 150).
  taxaMensal: number;

  // Pedidos esperados por mês no canal (rateia a taxa mensal).
  pedidosMensaisEstimados: number;

  ativo: boolean;
}

export interface PrecoDoProduto {
  produtoId: string;

  canal: CanalDeVenda;

  preco: number;

  // Custo total do produto e margem quando o preço foi fixado (aviso de impacto).
  custoReferencia?: number;

  margemReferencia?: number;
}

export const PARAMETROS_PADRAO: ParametrosPrecificacao = {
  pedidosMensaisEstimados: 0,
  impostoPercentual: 0,
  taxaPagamentoPercentual: 0,
  embalagemPedido: 0,
  itensPorPedidoEstimados: 1,
  margensCenario: [20, 25, 30, 35],
  margemMinimaPercentual: 20,
  cmvAlvoPercentual: 35,
};
