export interface ClienteListado {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  ativo: boolean;
  origemPrimeiroPedido?: string;
  criadoEm: string;
  // Calculados dos pedidos reais, sem os cancelados.
  quantidadePedidos: number;
  valorTotal: number;
  ticketMedio: number;
  ultimoPedidoEm?: string;
}

export interface ClienteDetalhe extends ClienteListado {
  cpf: string;
  dataNascimento?: string;
  enderecos: {
    id: string;
    rotulo: string;
    principal: boolean;
    texto: string;
  }[];
  pedidosRecentes: {
    id: string;
    numero: string;
    canal: string;
    status: string;
    total: number;
    criadoEm: string;
  }[];
}

// Dados que a tela pode corrigir. O telefone e o CPF identificam o cliente e
// não se alteram por aqui.
export interface EdicaoDeCliente {
  nome?: string;
  email?: string | null;
  dataNascimento?: string | null;
  ativo?: boolean;
}
