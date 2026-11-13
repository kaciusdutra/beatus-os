// O que a entrada de compra precisa do estoque e do registro de atividades.
// A implementação real fica em services/server (PostgreSQL).
export interface EstoqueDaCompraPort {
  // A compra confirmada entra no estoque (uma vez só por item).
  registrarEntrada(dados: {
    entradaCompraItemId: string;
    insumoId: string;
    quantidade: number;
    unidade: string;
    custoUnitario: number;
    documento?: string;
  }): Promise<void>;

  // Compra cancelada: o que entrou sai de volta.
  estornarEntradas(
    entradaCompraItemIds: string[],
    operador?: string | null
  ): Promise<void>;

  registrarAtividade(dados: {
    acao: string;
    resumo: string;
    referenciaId: string;
    referenciaNumero?: string;
    operador?: string | null;
  }): Promise<void>;
}
