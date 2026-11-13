import type { NovoTitulo } from "@/modules/financeiro/types/contasAPagar";

// O que a entrada de compra precisa do Financeiro para a compra a prazo.
// A implementação real fica em services/server (PostgreSQL).
export interface ContasDaCompraPort {
  // Confere as parcelas: tipo, vencimento, valores e soma igual ao total.
  validarTitulos(titulos: NovoTitulo[], valorTotal: number): NovoTitulo[];

  criarTitulos(
    origem: { entradaCompraId: string; fornecedorId: string },
    titulos: NovoTitulo[],
    operador?: string | null
  ): Promise<void>;

  // Compra cancelada: cancela os títulos em aberto; devolve quantos já estavam pagos.
  cancelarDaCompra(
    entradaCompraId: string,
    motivo: string,
    operador?: string | null
  ): Promise<{ cancelados: number; pagos: number }>;
}
