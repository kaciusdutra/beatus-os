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
  pagamentoStatus?: string;
}

export interface PedidoDetalhe extends PedidoListado {
  subtotal: number;
  descontos: number;
  taxaEntrega: number;
  distanciaEntregaKm?: number;
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
