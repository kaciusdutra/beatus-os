import type {
  CanalPedido,
  EnderecoPedido,
  EntradaPedido,
  FormaPagamento,
  ModalidadePagamento,
  StatusPagamento,
} from "./pedido";

// O que a tela (ou um canal externo) pode pedir ao servidor (sprint S2).
// Preço, subtotal, taxa de entrega, total, número, datas e situação
// operacional NÃO fazem parte: quem calcula é o servidor.

export interface AdicionalSolicitado {
  // Produto da categoria ADICIONAL.
  produtoId: string;

  quantidade: number;
}

export interface ItemSolicitado {
  produtoId: string;

  quantidade: number;

  observacao?: string;

  adicionais?: AdicionalSolicitado[];
}

export interface PedidoSolicitado {
  // Chave de idempotência opcional: o mesmo id nunca cria dois pedidos.
  id?: string;

  canal: CanalPedido;

  entrada: EntradaPedido;

  identificadorExterno?: string;

  // Pedido de marketplace não leva cliente nem endereço: o servidor usa o
  // cliente do canal e a plataforma entrega.
  clienteId?: string;

  enderecoEntrega?: EnderecoPedido;

  // Obrigatório nos canais iFood, 99Food e Keeta.
  marketplace?: {
    // Código do pedido na plataforma (para achar o repasse depois)
    codigo: string;

    // Nome do cliente final, só para consulta
    nomeCliente?: string;
  };

  // Distância até o endereço (km). O servidor calcula a taxa por ela.
  distanciaEntregaKm: number | null;

  itens: ItemSolicitado[];

  pagamento: {
    modalidade: ModalidadePagamento;

    forma: FormaPagamento;

    status: StatusPagamento;
  };
}
