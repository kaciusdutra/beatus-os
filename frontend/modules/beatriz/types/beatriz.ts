export type PapelNaConversa = "cliente" | "beatriz";

export interface MensagemDaConversa {
  papel: PapelNaConversa;
  texto: string;
}

export type IntencaoDoCliente = "PEDIDO" | "DUVIDA" | "CARDAPIO" | "RECLAMACAO" | "OUTRO";

export type PendenciaDoPedido = "ITENS" | "NOME" | "ENDERECO" | "CONFIRMACAO";

export interface AdicionalDoRascunho {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
}

// Linha do pedido em montagem, já conferida com o cardápio. Preço e subtotal
// vêm do cardápio (servidor), nunca do que a IA escreveu.
export interface ItemDoRascunho {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  observacao?: string;
  adicionais: AdicionalDoRascunho[];
  subtotal: number;
}

export interface RascunhoDePedido {
  itens: ItemDoRascunho[];
  // Soma dos itens. A entrega é calculada depois, pelo endereço.
  subtotal: number;
}

export interface DadosDoClienteNaConversa {
  nome?: string;
  endereco?: string;
  referencia?: string;
}

export interface RespostaDaBeatriz {
  intencao: IntencaoDoCliente;
  // Texto pronto para enviar ao cliente: o que a Beatriz disse (sem valores) mais
  // o resumo do pedido montado pelo sistema.
  resposta: string;
  rascunho: RascunhoDePedido;
  cliente: DadosDoClienteNaConversa;
  pendencias: PendenciaDoPedido[];
  // O cliente disse "pode fechar" ou algo equivalente; a decisão final continua humana.
  pedidoConfirmadoPeloCliente: boolean;
  // A conversa precisa de uma pessoa (reclamação, alergia, desconto, dúvida fora do cardápio...).
  precisaDeHumano: boolean;
  motivoHumano?: string;
  // Uma linha para o operador entender a situação de relance.
  resumoParaOperador: string;
  // O que o sistema corrigiu ou descartou na resposta da IA (ex.: produto que não existe).
  avisos: string[];
}

export interface UsoDoModelo {
  entrada: number;
  saida: number;
}
