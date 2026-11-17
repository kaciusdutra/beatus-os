import type { StatusOperacional } from "./pedido";

export interface PedidoListado {
  id: string;
  numero: string;
  canal: string;
  entrada: string;
  status: StatusOperacional;
  total: number;
  criadoEm: string;
  cliente: { id: string; nome: string; telefone: string };
  quantidadeItens: number;
  formaPagamento?: string;
  // Como o dinheiro entrou, em palavras claras (ex.: "Cartão de débito (Mercado Pago)").
  pagamentoRotulo?: string;
  pagamentoStatus?: string;
  // Pedido de marketplace
  codigoExterno?: string;
}

// Quem é o cliente deste pedido, vindo do cadastro e do histórico no banco (o mesmo para PDV, WhatsApp e site).
export interface ClienteDoPedido {
  cadastradoEm: string;
  // Nenhum pedido válido antes deste: o cadastro nasceu junto com ele.
  novoNestePedido: boolean;
  // Aceitou participar do clube de vantagens (mensagens de relacionamento).
  aceitaClube: boolean;
  totalDePedidosAnteriores: number;
  // Os mais recentes antes deste (sem os cancelados).
  pedidosAnteriores: { id: string; numero: string; canal: string; status: string; total: number; criadoEm: string }[];
}

export interface PedidoDetalhe extends PedidoListado {
  // Ausente nos pedidos de marketplace (o cliente é da plataforma).
  clienteDoPedido?: ClienteDoPedido;
  subtotal: number;
  descontos: number;
  taxaEntrega: number;
  distanciaEntregaKm?: number;
  nomeClienteExterno?: string;
  entregaPor?: string;
  liquidoEsperado?: number;
  conferenciaStatus?: string;
  valorRecebido?: number;
  endereco: string;
  itens: {
    id: string;
    nome: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
    observacao?: string;
  }[];
  pagamentos: {
    id: string;
    modalidade: string;
    forma: string;
    rotulo: string;
    origem: string;
    // Identificador do pagamento no gateway (para conferir ou estornar).
    referencia?: string;
    status: string;
    valor: number;
    aprovadoEm?: string;
  }[];
  atividades: {
    id: string;
    acao: string;
    resumo: string;
    operador?: string;
    criadoEm: string;
  }[];
  // Campanha de anúncio de onde o pedido veio, quando houver.
  campanha?: string;
  // Avisos ao cliente sobre o andamento (só pedidos do site e do WhatsApp).
  avisos?: {
    id: string;
    evento: string;
    canal: string;
    texto: string;
    status: string;
    criadoEm: string;
    enviadoEm?: string;
    // Por que o aviso falhou ou foi dispensado.
    erro?: string;
  }[];
}

export interface FiltroDePedidos {
  status?: string;
  canal?: string;
  // AAAA-MM-DD, os dois dias inclusos
  de?: string;
  ate?: string;
  // Número do pedido, nome ou telefone do cliente
  busca?: string;
  clienteId?: string;
  limite?: number;
}

export interface ResumoDePedidos {
  quantidade: number;
  // Soma dos totais, sem os cancelados
  valorTotal: number;
  ticketMedio: number;
}
