import {
  EntradaCompra,
  EntradaCompraItem,
  StatusEntradaCompra,
  TipoDocumentoEntradaCompra,
} from "../types/entradaCompra";

import {
  EntradaCompraDocumento,
  TipoDocumentoEntradaCompraArquivo,
  OrigemDocumentoEntradaCompra,
  StatusLeituraDocumentoEntradaCompra,
} from "../types/entradaCompraDocumento";

import {
  EntradaCompraRepositoryPort,
} from "../repositories/entradaCompraRepositoryPort";

import {
  FornecedorRepositoryPort,
} from "@/modules/fornecedores/repositories/fornecedorRepositoryPort";

export interface CriarEntradaCompraInput {
  entrada: EntradaCompra;
}

export interface AtualizarEntradaCompraInput {
  entrada: EntradaCompra;
}

const TIPOS_DOCUMENTO_VALIDOS:
  TipoDocumentoEntradaCompra[] = [
    "NOTA_FISCAL",
    "RECIBO",
    "COMPROVANTE",
    "OUTRO",
  ];

const TIPOS_ARQUIVO_VALIDOS:
  TipoDocumentoEntradaCompraArquivo[] = [
    "NOTA_FISCAL",
    "RECIBO",
    "COMPROVANTE",
    "OUTRO",
  ];

const ORIGENS_DOCUMENTO_VALIDAS:
  OrigemDocumentoEntradaCompra[] = [
    "FOTOGRAFIA",
    "UPLOAD",
    "XML",
    "IMPORTACAO",
  ];

const STATUS_LEITURA_VALIDOS:
  StatusLeituraDocumentoEntradaCompra[] = [
    "PENDENTE",
    "PROCESSANDO",
    "EXTRAIDO",
    "ERRO",
  ];

function validarTipoDocumento(
  tipo: string
): asserts tipo is TipoDocumentoEntradaCompra {
  if (
    !TIPOS_DOCUMENTO_VALIDOS.includes(
      tipo as TipoDocumentoEntradaCompra
    )
  ) {
    throw new Error(
      "Tipo de documento da entrada de compra inválido."
    );
  }
}

function validarStatus(
  status: string
): asserts status is StatusEntradaCompra {
  if (
    ![
      "RASCUNHO",
      "CONFIRMADA",
      "CANCELADA",
    ].includes(status)
  ) {
    throw new Error(
      "Status da entrada de compra inválido."
    );
  }
}

function calcularTotalItem(
  item: EntradaCompraItem
): number {
  return (
    item.quantidade *
      item.valorUnitario -
    item.desconto
  );
}

function validarItem(
  item: EntradaCompraItem
): EntradaCompraItem {
  if (
    !item.descricaoOriginal.trim()
  ) {
    throw new Error(
      "A descrição do item da entrada de compra é obrigatória."
    );
  }

  if (
    !Number.isFinite(
      item.quantidade
    ) ||
    item.quantidade <= 0
  ) {
    throw new Error(
      "A quantidade do item deve ser maior que zero."
    );
  }

  if (
    !item.unidade.trim()
  ) {
    throw new Error(
      "A unidade do item da entrada de compra é obrigatória."
    );
  }

  if (
    !Number.isFinite(
      item.valorUnitario
    ) ||
    item.valorUnitario < 0
  ) {
    throw new Error(
      "O valor unitário do item é inválido."
    );
  }

  if (
    !Number.isFinite(
      item.desconto
    ) ||
    item.desconto < 0
  ) {
    throw new Error(
      "O desconto do item é inválido."
    );
  }

  const totalCalculado =
    calcularTotalItem(item);

  if (
    totalCalculado < 0
  ) {
    throw new Error(
      "O desconto do item não pode ser maior que o valor bruto do item."
    );
  }

  const diferenca =
    Math.abs(
      totalCalculado -
        item.valorTotal
    );

  if (
    diferenca > 0.01
  ) {
    throw new Error(
      "O valor total do item não corresponde à quantidade, valor unitário e desconto informados."
    );
  }

  return {
    ...item,

    valorTotal:
      Number(
        totalCalculado.toFixed(2)
      ),
  };
}

function validarValoresEntrada(
  entrada: EntradaCompra,
  itensValidados: EntradaCompraItem[]
): EntradaCompra {
  if (
    !Number.isFinite(
      entrada.valorDesconto
    ) ||
    entrada.valorDesconto < 0
  ) {
    throw new Error(
      "O desconto da entrada é inválido."
    );
  }

  if (
    !Number.isFinite(
      entrada.valorFrete
    ) ||
    entrada.valorFrete < 0
  ) {
    throw new Error(
      "O frete da entrada é inválido."
    );
  }

  if (
    !Number.isFinite(
      entrada.valorProdutos
    ) ||
    entrada.valorProdutos < 0
  ) {
    throw new Error(
      "O valor dos produtos da entrada é inválido."
    );
  }

  if (
    !Number.isFinite(
      entrada.valorTotal
    ) ||
    entrada.valorTotal < 0
  ) {
    throw new Error(
      "O valor total da entrada é inválido."
    );
  }

  const somaItens =
    itensValidados.reduce(
      (
        total,
        item
      ) =>
        total +
        item.valorTotal,
      0
    );

  const diferencaProdutos =
    Math.abs(
      somaItens -
        entrada.valorProdutos
    );

  if (
    diferencaProdutos > 0.01
  ) {
    throw new Error(
      "O valor dos produtos da entrada não corresponde à soma dos itens."
    );
  }

  const totalCalculado =
    somaItens -
    entrada.valorDesconto +
    entrada.valorFrete;

  const diferencaTotal =
    Math.abs(
      totalCalculado -
        entrada.valorTotal
    );

  if (
    diferencaTotal > 0.01
  ) {
    throw new Error(
      "O valor total da entrada não corresponde aos itens, desconto e frete informados."
    );
  }

  return {
    ...entrada,

    itens:
      itensValidados,

    valorProdutos:
      Number(
        somaItens.toFixed(2)
      ),

    valorTotal:
      Number(
        totalCalculado.toFixed(2)
      ),
  };
}

function validarEntrada(
  entrada: EntradaCompra
): EntradaCompra {
  if (
    !entrada.fornecedorId.trim()
  ) {
    throw new Error(
      "O fornecedor da entrada de compra é obrigatório."
    );
  }

  validarTipoDocumento(
    entrada.tipoDocumento
  );

  validarStatus(
    entrada.status
  );

  if (
    entrada.itens.length === 0
  ) {
    throw new Error(
      "A entrada de compra precisa ter pelo menos um item."
    );
  }

  const itensValidados =
    entrada.itens.map(
      validarItem
    );

  return validarValoresEntrada(
    entrada,
    itensValidados
  );
}

function validarAlteracaoPermitida(
  status: StatusEntradaCompra
): void {
  if (
    status !== "RASCUNHO"
  ) {
    throw new Error(
      "Apenas entradas em RASCUNHO podem ser alteradas."
    );
  }
}

function validarDocumento(
  documento: EntradaCompraDocumento
): void {
  if (
    !documento.id.trim()
  ) {
    throw new Error(
      "O ID do documento é obrigatório."
    );
  }

  if (
    !documento.entradaCompraId.trim()
  ) {
    throw new Error(
      "A entrada de compra do documento é obrigatória."
    );
  }

  if (
    !documento.nomeArquivo.trim()
  ) {
    throw new Error(
      "O nome do arquivo é obrigatório."
    );
  }

  if (
    !documento.mimeType.trim()
  ) {
    throw new Error(
      "O MIME type do arquivo é obrigatório."
    );
  }

  if (
    !Number.isInteger(
      documento.tamanho
    ) ||
    documento.tamanho <= 0
  ) {
    throw new Error(
      "O tamanho do arquivo deve ser maior que zero."
    );
  }

  if (
    !TIPOS_ARQUIVO_VALIDOS.includes(
      documento.tipoDocumento
    )
  ) {
    throw new Error(
      "Tipo de documento do arquivo inválido."
    );
  }

  if (
    !ORIGENS_DOCUMENTO_VALIDAS.includes(
      documento.origem
    )
  ) {
    throw new Error(
      "Origem do documento inválida."
    );
  }

  if (
    documento.statusLeitura !==
      "PENDENTE" &&
    !STATUS_LEITURA_VALIDOS.includes(
      documento.statusLeitura
    )
  ) {
    throw new Error(
      "Status de leitura do documento inválido."
    );
  }

  if (
    !documento.caminhoArquivo?.trim()
  ) {
    throw new Error(
      "O caminho do arquivo é obrigatório."
    );
  }
}

export class EntradaCompraService {
  constructor(
    private readonly repository:
      EntradaCompraRepositoryPort,

    private readonly fornecedorRepository:
      FornecedorRepositoryPort
  ) {}

  async buscarPorId(
    entradaId: string
  ): Promise<
    EntradaCompra | undefined
  > {
    return this.repository.buscarPorId(
      entradaId
    );
  }

  async listar(): Promise<
    EntradaCompra[]
  > {
    return this.repository.listar();
  }

  async criarEntradaCompra(
    input: CriarEntradaCompraInput
  ): Promise<EntradaCompra> {
    const fornecedor =
      await this.fornecedorRepository.buscarPorId(
        input.entrada.fornecedorId
      );

    if (!fornecedor) {
      throw new Error(
        "Fornecedor não encontrado."
      );
    }

    const entrada:
      EntradaCompra =
      {
        ...input.entrada,

        status:
          input.entrada.status ??
          "RASCUNHO",

        documentos:
          input.entrada.documentos ??
          [],
      };

    validarAlteracaoPermitida(
      entrada.status
    );

    const entradaValidada =
      validarEntrada(
        entrada
      );

    return this.repository.criar(
      entradaValidada
    );
  }

  async atualizarEntradaCompra(
    input: AtualizarEntradaCompraInput
  ): Promise<EntradaCompra> {
    const existente =
      await this.repository.buscarPorId(
        input.entrada.id
      );

    if (!existente) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    validarAlteracaoPermitida(
      existente.status
    );

    const fornecedor =
      await this.fornecedorRepository.buscarPorId(
        input.entrada.fornecedorId
      );

    if (!fornecedor) {
      throw new Error(
        "Fornecedor não encontrado."
      );
    }

    const entrada:
      EntradaCompra =
      {
        ...input.entrada,

        status:
          existente.status,

        documentos:
          existente.documentos,

        criadoEm:
          existente.criadoEm,
      };

    const entradaValidada =
      validarEntrada(
        entrada
      );

    return this.repository.atualizar(
      entradaValidada
    );
  }

  async adicionarDocumento(
    documento: EntradaCompraDocumento
  ): Promise<EntradaCompraDocumento> {
    const entrada =
      await this.repository.buscarPorId(
        documento.entradaCompraId
      );

    if (!entrada) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    if (
      entrada.status !==
      "RASCUNHO"
    ) {
      throw new Error(
        "Somente entradas em RASCUNHO podem receber documentos."
      );
    }

    validarDocumento(
      documento
    );

    return this.repository.adicionarDocumento(
      documento
    );
  }

    async buscarDocumentoPorId(
    id: string
  ): Promise<EntradaCompraDocumento | undefined> {
    return this.repository.buscarDocumentoPorId(id);
  }

  async removerDocumento(
    id: string
  ): Promise<void> {
    const documento =
      await this.repository.buscarDocumentoPorId(id);

    if (!documento) {
      throw new Error(
        "Documento da entrada de compra não encontrado."
      );
    }

    const entrada =
      await this.repository.buscarPorId(
        documento.entradaCompraId
      );

    if (!entrada) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    if (entrada.status !== "RASCUNHO") {
      throw new Error(
        "Somente entradas em RASCUNHO podem remover documentos."
      );
    }

    await this.repository.removerDocumento(id);
  }

  async confirmarEntradaCompra(
    entradaId: string
  ): Promise<EntradaCompra> {
    const existente =
      await this.repository.buscarPorId(
        entradaId
      );

    if (!existente) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    if (
      existente.status !==
      "RASCUNHO"
    ) {
      throw new Error(
        "Somente entradas em RASCUNHO podem ser confirmadas."
      );
    }

    const entradaValidada =
      validarEntrada(
        existente
      );

    const confirmada:
      EntradaCompra =
      {
        ...entradaValidada,

        status:
          "CONFIRMADA",

        atualizadoEm:
          new Date().toISOString(),
      };

    return this.repository.atualizar(
      confirmada
    );
  }

  async cancelarEntradaCompra(
    entradaId: string,
    motivo: string
  ): Promise<EntradaCompra> {
    const existente =
      await this.repository.buscarPorId(
        entradaId
      );

    if (!existente) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    if (
      existente.status !==
      "CONFIRMADA"
    ) {
      throw new Error(
        "Somente entradas CONFIRMADAS podem ser canceladas."
      );
    }

    if (
      !motivo.trim()
    ) {
      throw new Error(
        "O motivo do cancelamento é obrigatório."
      );
    }

    const cancelada:
      EntradaCompra =
      {
        ...existente,

        status:
          "CANCELADA",

        observacao:
          existente.observacao
            ? `${existente.observacao} | Cancelamento: ${motivo.trim()}`
            : `Cancelamento: ${motivo.trim()}`,

        atualizadoEm:
          new Date().toISOString(),
      };

    return this.repository.atualizar(
      cancelada
    );
  }

  async removerEntradaCompra(
    entradaId: string
  ): Promise<void> {
    const existente =
      await this.repository.buscarPorId(
        entradaId
      );

    if (!existente) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    if (
      existente.status !==
      "RASCUNHO"
    ) {
      throw new Error(
        "Somente entradas em RASCUNHO podem ser removidas."
      );
    }

    await this.repository.remover(
      entradaId
    );
  }
}