import type {
  ConfiguracaoFinanceira,
  ContaPagar,
  NovoTitulo,
  PagamentoDeTitulo,
  StatusDoTitulo,
} from "../types/contasAPagar";

export interface FiltroDeTitulos {
  status?: StatusDoTitulo;
  // AAAA-MM-DD
  vencimentoDe?: string;
  vencimentoAte?: string;
}

// Porta de persistência dos títulos a pagar e do saldo inicial do caixa.
export interface ContaPagarRepositoryPort {
  criarTitulos(
    origem: { entradaCompraId?: string; fornecedorId: string },
    titulos: NovoTitulo[],
    operador?: string | null
  ): Promise<ContaPagar[]>;

  listar(filtro?: FiltroDeTitulos): Promise<ContaPagar[]>;

  pagar(
    id: string,
    pagamento: PagamentoDeTitulo,
    operador?: string | null
  ): Promise<ContaPagar>;

  // Cancela um título em aberto (nunca apaga).
  cancelar(id: string, motivo: string, operador?: string | null): Promise<void>;

  // Compra cancelada: cancela os títulos em aberto e conta os que já foram pagos.
  cancelarDaCompra(
    entradaCompraId: string,
    motivo: string,
    operador?: string | null
  ): Promise<{ cancelados: number; pagos: number }>;

  buscarConfiguracao(): Promise<ConfiguracaoFinanceira>;

  salvarConfiguracao(
    configuracao: ConfiguracaoFinanceira,
    operador?: string | null
  ): Promise<ConfiguracaoFinanceira>;
}
