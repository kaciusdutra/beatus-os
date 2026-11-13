import type {
  ConferirPedido,
  PedidoDoMarketplace,
  StatusDaConferencia,
} from "../types/conferenciaMarketplace";

// Porta de persistência da conferência dos repasses dos marketplaces.
export interface ConferenciaMarketplaceRepositoryPort {
  listar(status?: StatusDaConferencia): Promise<PedidoDoMarketplace[]>;

  // Marca o pedido como conferido; recusa se já estiver conferido ou cancelado.
  conferir(
    pedidoId: string,
    dados: ConferirPedido,
    operador?: string | null
  ): Promise<PedidoDoMarketplace>;
}
