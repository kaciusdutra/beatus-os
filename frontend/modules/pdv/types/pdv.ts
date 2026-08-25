import {
  CanalPedido,
  EntradaPedido,
  FormaPagamento,
  StatusPagamento,
} from "@/modules/pedidos/types/pedido";

export interface ProdutoPDV {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  preco: number;
  ativo: boolean;
}

export interface ItemComanda {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  adicionais?: ItemComandaAdicional[];
  observacao?: string;
}

export interface ItemComandaAdicional {
  id: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface PdvFormulario {
  canal: CanalPedido;
  entrada: EntradaPedido;

  cliente: string;
  telefone: string;
  endereco: string;

  taxaEntrega: number;

  formaPagamento: FormaPagamento;

  statusPagamento: StatusPagamento;
}