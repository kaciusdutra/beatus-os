import {
  ClassificacaoItemInput,
  EntradaCompra,
  HistoricoPrecoInsumoRegistro,
  MemoriaClassificacaoItemCompra,
  MemoriaClassificacaoRegistro,
} from "../types/entradaCompra";

import {
  EntradaCompraDocumento,
} from "../types/entradaCompraDocumento";

export interface EntradaCompraRepositoryPort {
  criar(
    entrada: EntradaCompra
  ): Promise<EntradaCompra>;

  buscarPorId(
    id: string
  ): Promise<
    EntradaCompra | undefined
  >;

  listar(): Promise<
    EntradaCompra[]
  >;

  // Entradas (de qualquer status) com a mesma chave de acesso.
  buscarPorChaveAcesso(
    chaveAcesso: string
  ): Promise<EntradaCompra[]>;

  atualizar(
    entrada: EntradaCompra
  ): Promise<EntradaCompra>;

  remover(
    id: string
  ): Promise<void>;

  adicionarDocumento(
    documento: EntradaCompraDocumento
  ): Promise<EntradaCompraDocumento>;

    removerDocumento(
    id: string
  ): Promise<void>;

    buscarDocumentoPorId(
    id: string
  ): Promise<EntradaCompraDocumento | undefined>;

  // Grava só o destino dos itens.
  classificarItens(
    entradaId: string,
    itens: ClassificacaoItemInput[]
  ): Promise<EntradaCompra>;

  buscarMemoriasClassificacao(
    fornecedorId: string,
    descricoesNormalizadas: string[]
  ): Promise<MemoriaClassificacaoItemCompra[]>;

  // Todas as memórias da empresa (tela de vínculos, bloco 8A).
  listarMemoriasClassificacao(): Promise<
    MemoriaClassificacaoRegistro[]
  >;

  buscarMemoriaClassificacaoPorId(
    id: string
  ): Promise<MemoriaClassificacaoRegistro | undefined>;

  // Liga (ou desliga, com null) o insumo de um item do fornecedor.
  vincularMemoriaAoInsumo(
    id: string,
    insumoId: string | null
  ): Promise<MemoriaClassificacaoRegistro>;

  // Grava o insumo nos itens de entradas já lançadas.
  vincularItensAoInsumo(
    itemIds: string[],
    insumoId: string | null
  ): Promise<void>;

  // Cria ou atualiza a memória e soma 1 em vezesUsada.
  registrarMemoriasClassificacao(
    memorias: MemoriaClassificacaoItemCompra[]
  ): Promise<void>;

  // Bloco 8C: conversão do item e histórico de preços do insumo.
  gravarConversaoItem(
    itemId: string,
    quantidadeConvertida: number,
    unidadeConvertida: string
  ): Promise<void>;

  registrarHistoricoPreco(
    registro: Omit<HistoricoPrecoInsumoRegistro, "id" | "criadoEm">
  ): Promise<void>;

  listarHistoricoPorInsumo(
    insumoId: string
  ): Promise<HistoricoPrecoInsumoRegistro[]>;

  buscarHistoricoDosItens(
    itemIds: string[]
  ): Promise<HistoricoPrecoInsumoRegistro[]>;

  removerHistoricoDosItens(itemIds: string[]): Promise<void>;

  atualizarCustoAnteriorHistorico(
    id: string,
    custoAnterior: number
  ): Promise<void>;
}