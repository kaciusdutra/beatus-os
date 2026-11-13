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

  // Compras confirmadas, pela data de pagamento (ou da entrada, se antiga), no período.
  listarComprasPagas(de: Date, ate: Date): Promise<CompraPaga[]>;

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
