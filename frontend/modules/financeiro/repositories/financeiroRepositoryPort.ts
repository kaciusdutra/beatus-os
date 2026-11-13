import type { TituloPago } from "../types/contasAPagar";

import type { PedidoDoDia } from "../types/conferenciaDoDia";

import type {
  CompraPaga,
  LancamentoManual,
  NovoLancamento,
  PagamentoRecebido,
} from "../types/fluxoDeCaixa";

// Porta de persistência do Financeiro. O serviço só conhece esta interface;
// o Prisma fica na implementação em ./postgres.
export interface FinanceiroRepositoryPort {
  // Pagamentos aprovados de pedidos não cancelados, no período [de, ate).
  listarPagamentosRecebidos(de: Date, ate: Date): Promise<PagamentoRecebido[]>;

  // Pedidos criados no período [de, ate), de qualquer situação, com o que já foi pago (conferência do dia).
  listarPedidosDoDia(de: Date, ate: Date): Promise<PedidoDoDia[]>;

  // Repasses de marketplace conferidos no período [de, ate): entrada no valor e na data recebidos.
  listarRepassesRecebidos(de: Date, ate: Date): Promise<PagamentoRecebido[]>;

  // Compras confirmadas à vista, pela data de pagamento (ou da entrada, se antiga), no período.
  // Compras a prazo não entram aqui: contam pelo pagamento dos títulos.
  listarComprasPagas(de: Date, ate: Date): Promise<CompraPaga[]>;

  // Títulos pagos no período [de, ate).
  listarTitulosPagos(de: Date, ate: Date): Promise<TituloPago[]>;

  listarLancamentos(de: Date, ate: Date): Promise<LancamentoManual[]>;

  criarLancamento(
    dados: NovoLancamento,
    operador?: string | null
  ): Promise<LancamentoManual>;

  // Nunca apaga: marca como cancelado, com motivo, e registra a atividade.
  cancelarLancamento(
    id: string,
    motivo: string,
    operador?: string | null
  ): Promise<void>;
}
