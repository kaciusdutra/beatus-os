import type {
  FiltroDePedidos,
  PedidoDetalhe,
  PedidoListado,
} from "../types/consultaPedido";

// Porta de leitura dos pedidos para as telas de consulta (Pedidos e Clientes).
// O serviço só conhece esta interface; o Prisma fica na implementação em ./postgres.
export interface PedidoConsultaRepositoryPort {
  // Datas já convertidas: de (inclusivo) e ate (exclusivo).
  listar(
    filtro: Omit<FiltroDePedidos, "de" | "ate" | "limite"> & {
      de?: Date;
      ate?: Date;
      limite: number;
    }
  ): Promise<PedidoListado[]>;

  buscarDetalhe(id: string): Promise<PedidoDetalhe | null>;
}
