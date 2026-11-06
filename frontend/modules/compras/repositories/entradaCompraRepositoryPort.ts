import {
  ClassificacaoItemInput,
  EntradaCompra,
  MemoriaClassificacaoItemCompra,
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

  // Cria ou atualiza a memória e soma 1 em vezesUsada.
  registrarMemoriasClassificacao(
    memorias: MemoriaClassificacaoItemCompra[]
  ): Promise<void>;
}