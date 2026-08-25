export type CanalPedido =
  | "PDV"
  | "WHATSAPP"
  | "CARDAPIO_ONLINE"
  | "IFOOD"
  | "99FOOD"
  | "KEETA";

export type EntradaPedido =
  | "MANUAL"
  | "IA"
  | "ONLINE"
  | "API";

export type ModalidadePagamento =
  | "ELETRONICO"
  | "NA_ENTREGA";

export type FormaPagamento =
  | "PIX"
  | "CARTAO"
  | "DINHEIRO"
  | "IFOOD"
  | "OUTRO"
  | "A_DEFINIR";

export type StatusPagamento =
  | "PENDENTE"
  | "COBRANCA_GERADA"
  | "AGUARDANDO_PAGAMENTO"
  | "PROCESSANDO"
  | "APROVADO"
  | "RECUSADO"
  | "CANCELADO"
  | "ESTORNADO"
  | "EXPIRADO";

export type OrigemPagamento =
  | "PDV_INTERNO"
  | "CHECKOUT_ONLINE"
  | "MARKETPLACE"
  | "ENTREGA";

export type StatusOperacional =
  | "NOVO"
  | "EM_PREPARO"
  | "PRONTO"
  | "EM_ROTA"
  | "ENTREGUE"
  | "CANCELADO";

export interface ClienteResumoPedido {
  clienteId: string;

  nome: string;

  telefone: string;

  endereco?: string;
}

export interface EnderecoPedido {
  enderecoId?: string;

  rotulo?: string;

  cep?: string;

  logradouro: string;

  numero: string;

  complemento?: string;

  bairro: string;

  cidade: string;

  estado: string;

  latitude?: number;

  longitude?: number;
}

export interface PedidoAdicional {
  id: string;

  nome: string;

  quantidade: number;

  precoUnitario: number;

  subtotal: number;
}

export interface ItemPedido {
  produtoId: string;

  nome: string;

  quantidade: number;

  precoUnitario: number;

  subtotal: number;

  adicionais?: PedidoAdicional[];

  observacao?: string;
}

export interface PagamentoPedido {
  modalidade: ModalidadePagamento;

  forma: FormaPagamento;

  status: StatusPagamento;

  origem: OrigemPagamento;

  valor: number;

  cobrancaNoPdvHabilitada: boolean;

  confirmacaoAutomatica: boolean;

  transacaoExterna?: string;

  checkoutUrl?: string;

  copiaECola?: string;

  qrCode?: string;

  criadoEm: string;

  aprovadoEm?: string;
}

export interface Pedido {
  id: string;

  numero: number;

  canal: CanalPedido;

  entrada: EntradaPedido;

  identificadorExterno?: string;

  cliente: ClienteResumoPedido;

  enderecoEntrega: EnderecoPedido;

  itens: ItemPedido[];

  subtotal: number;

  descontos: number;

  taxaEntrega: number;

  total: number;

  distanciaEntregaKm: number | null;

  regraEntregaAplicada?: string;

  pagamento: PagamentoPedido;

  statusOperacional: StatusOperacional;

  criadoEm: string;

  atualizadoEm: string;
}