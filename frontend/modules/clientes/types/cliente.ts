export type CanalOrigemCliente =
  | "PDV"
  | "WHATSAPP"
  | "CARDAPIO_ONLINE"
  | "IFOOD"
  | "99FOOD"
  | "KEETA"
  | "OUTRO";

export type RotuloEndereco =
  | "CASA"
  | "TRABALHO"
  | "FAMILIA"
  | "OUTRO";

export interface EnderecoCliente {
  id: string;

  rotulo: RotuloEndereco;

  cep?: string;

  logradouro: string;

  numero: string;

  complemento?: string;

  bairro: string;

  cidade: string;

  estado: string;

  latitude?: number;

  longitude?: number;

  principal: boolean;

  criadoEm: string;

  atualizadoEm: string;
}

export interface Cliente {
  id: string;

  nome: string;

  telefone: string;

  cpf: string;

  email?: string;

  dataNascimento?: string;

  origemPrimeiroPedido: CanalOrigemCliente;

  enderecos: EnderecoCliente[];

  primeiroPedidoEm?: string;

  ultimoPedidoEm?: string;

  quantidadePedidos: number;

  valorTotalCompras: number;

  ticketMedio: number;

  criadoEm: string;

  atualizadoEm: string;

  ativo: boolean;
}