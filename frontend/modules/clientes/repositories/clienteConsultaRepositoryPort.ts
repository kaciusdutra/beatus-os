import type {
  ClienteDetalhe,
  ClienteListado,
} from "../types/consultaCliente";

// Porta de leitura dos clientes para a tela Clientes. O serviço só conhece
// esta interface; o Prisma fica na implementação em ./postgres.
export interface ClienteConsultaRepositoryPort {
  listar(busca: string | undefined, limite: number): Promise<ClienteListado[]>;

  buscarDetalhe(id: string): Promise<ClienteDetalhe | null>;
}
