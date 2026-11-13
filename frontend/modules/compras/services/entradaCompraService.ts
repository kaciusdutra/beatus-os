import {
  ClassificacaoItemInput,
  EntradaCompra,
  IdentificacaoItemCompra,
  EntradaCompraItem,
  MemoriaClassificacaoItemCompra,
  MemoriaClassificacaoRegistro,
  StatusEntradaCompra,
  TipoDocumentoEntradaCompra,
  VinculoItemCompra,
  FORMAS_DE_PAGAMENTO_DA_COMPRA,
} from "../types/entradaCompra";

import {
  contarItensSemDestino,
  ehDestinoItemCompra,
  normalizarDescricaoItemCompra,
} from "../domain/destinoItemCompra";

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

import {
  InsumoRepositoryPort,
} from "@/modules/insumos/repositories/insumoRepositoryPort";

import type {
  EstoqueDaCompraPort,
} from "./estoqueDaCompraPort";

import {
  aplicarPrecoNoInsumo,
  calcularCustoDaCompra,
  ordenarHistorico,
} from "./custoDaCompra";

import type {
  HistoricoPrecoInsumoRegistro,
} from "../types/entradaCompra";

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

  for (const [rotulo, valor] of [
    ["ICMS-ST", entrada.valorIcmsSt],
    ["IPI", entrada.valorIpi],
    ["seguro", entrada.valorSeguro],
    ["outras despesas", entrada.valorOutrasDespesas],
  ] as const) {
    if (
      valor !== undefined &&
      (!Number.isFinite(valor) || valor < 0)
    ) {
      throw new Error(
        `O valor de ${rotulo} da entrada é inválido.`
      );
    }
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

function ehDestinoComInsumo(
  destino?: string | null
): boolean {
  return (
    destino === "INSUMO" ||
    destino === "EMBALAGEM"
  );
}

// Junta a memória do fornecedor com a compra confirmada mais recente do item.
function montarVinculo(
  memoria: MemoriaClassificacaoRegistro,
  entradas: EntradaCompra[]
): VinculoItemCompra {
  let ultima:
    | {
        entrada: EntradaCompra;
        item: EntradaCompraItem;
      }
    | undefined;

  for (const entrada of entradas) {
    if (
      entrada.status !== "CONFIRMADA" ||
      entrada.fornecedorId !==
        memoria.fornecedorId
    ) {
      continue;
    }

    for (const item of entrada.itens) {
      if (
        normalizarDescricaoItemCompra(
          item.descricaoOriginal
        ) !== memoria.descricaoNormalizada
      ) {
        continue;
      }

      if (
        !ultima ||
        entrada.dataEntrada >
          ultima.entrada.dataEntrada
      ) {
        ultima = { entrada, item };
      }
    }
  }

  return {
    id: memoria.id,
    fornecedorId: memoria.fornecedorId,
    descricaoNormalizada:
      memoria.descricaoNormalizada,
    descricao:
      ultima?.item.descricaoOriginal ??
      memoria.descricaoNormalizada,
    destino: memoria.destino,
    vezesUsada: memoria.vezesUsada,
    insumoId: memoria.insumoId,
    ultimaCompra: ultima
      ? {
          entradaId: ultima.entrada.id,
          numeroDocumento:
            ultima.entrada.numeroDocumento,
          dataEntrada:
            ultima.entrada.dataEntrada,
          quantidade: ultima.item.quantidade,
          unidade: ultima.item.unidade,
          valorUnitario:
            ultima.item.valorUnitario,
          desconto: ultima.item.desconto,
        }
      : undefined,
  };
}

function montarMemorias(
  entrada: EntradaCompra
): MemoriaClassificacaoItemCompra[] {
  const porDescricao = new Map<
    string,
    MemoriaClassificacaoItemCompra
  >();

  for (const item of entrada.itens) {
    if (!item.destino) {
      continue;
    }

    const descricaoNormalizada =
      normalizarDescricaoItemCompra(
        item.descricaoOriginal
      );

    if (!descricaoNormalizada) {
      continue;
    }

    porDescricao.set(descricaoNormalizada, {
      fornecedorId: entrada.fornecedorId,
      descricaoNormalizada,
      destino: item.destino,
    });
  }

  return [...porDescricao.values()];
}

export class EntradaCompraService {
  constructor(
    private readonly repository:
      EntradaCompraRepositoryPort,

    private readonly fornecedorRepository:
      FornecedorRepositoryPort,

    private readonly insumoRepository:
      InsumoRepositoryPort,

    private readonly estoque?: EstoqueDaCompraPort
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

    await this.garantirNotaNaoLancada(
      entradaValidada.chaveAcesso
    );

    return this.repository.criar(
      entradaValidada
    );
  }

  // Regra 9.18: a mesma nota (chave de acesso) não pode ser lançada duas
  // vezes; só vale de novo se a entrada anterior tiver sido cancelada.
  private async garantirNotaNaoLancada(
    chaveAcesso: string | undefined,
    ignorarEntradaId?: string
  ): Promise<void> {
    if (!chaveAcesso) {
      return;
    }

    const existentes =
      await this.repository.buscarPorChaveAcesso(
        chaveAcesso
      );

    const lancada = existentes.find(
      (entrada) =>
        entrada.id !== ignorarEntradaId &&
        entrada.status !== "CANCELADA"
    );

    if (lancada) {
      const documento =
        lancada.numeroDocumento ?? "sem número";

      throw new Error(
        lancada.status === "CONFIRMADA"
          ? `Esta nota já foi lançada (documento ${documento}, entrada confirmada). Para lançar de novo, cancele a entrada existente.`
          : `Esta nota já foi lançada (documento ${documento}, entrada em rascunho). Abra a entrada existente para continuar o lançamento.`
      );
    }
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

    await this.garantirNotaNaoLancada(
      entradaValidada.chaveAcesso,
      entradaValidada.id
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
    entradaId: string,
    operador?: string | null,
    pagamento?: { forma?: string; pagoEm?: string }
  ): Promise<EntradaCompra> {
    const forma = pagamento?.forma?.trim().toUpperCase();

    if (forma && !FORMAS_DE_PAGAMENTO_DA_COMPRA.includes(forma)) {
      throw new Error(
        "Forma de pagamento inválida. Use PIX, DINHEIRO ou CARTAO."
      );
    }

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

    // Regra 9.8: só confirma com todos os itens classificados.
    if (
      contarItensSemDestino(existente.itens) > 0
    ) {
      throw new Error(
        "Classifique o destino de todos os itens antes de confirmar a entrada."
      );
    }

    const confirmada:
      EntradaCompra =
      {
        ...entradaValidada,

        status:
          "CONFIRMADA",

        // Pagamento à vista: a data é a informada ou o momento da confirmação.
        formaPagamento: forma || undefined,

        pagoEm: forma
          ? pagamento?.pagoEm || new Date().toISOString()
          : undefined,

        atualizadoEm:
          new Date().toISOString(),
      };

    const resultado =
      await this.repository.atualizar(
        confirmada
      );

    // A memória aprende com as entradas confirmadas.
    await this.repository.registrarMemoriasClassificacao(
      montarMemorias(resultado)
    );

    // Itens cujo fornecedor já tem insumo ligado (regra 7.13) levam o vínculo.
    await this.ligarItensPelaMemoria(
      resultado
    );

    // Bloco 8C: o custo do insumo passa a ser o preço desta compra.
    const final =
      (await this.repository.buscarPorId(resultado.id)) ??
      resultado;

    const { avisos } = await this.aplicarCustosDaEntrada(final);

    await this.estoque?.registrarAtividade({
      acao: "CONFIRMADA",
      resumo: `Entrada de compra${final.numeroDocumento ? ` ${final.numeroDocumento}` : ""} confirmada: ${final.itens.length} item(ns), R$ ${final.valorTotal.toFixed(2)}.`,
      referenciaId: final.id,
      referenciaNumero: final.numeroDocumento,
      operador,
    });

    return { ...final, avisosCusto: avisos };
  }

  // Regra 7.13: o item do fornecedor ligado a um insumo passa o vínculo
  // para os itens da entrada que acabou de ser confirmada.
  private async ligarItensPelaMemoria(
    entrada: EntradaCompra
  ): Promise<void> {
    const chaves = [
      ...new Set(
        entrada.itens
          .filter((item) =>
            ehDestinoComInsumo(item.destino)
          )
          .map((item) =>
            normalizarDescricaoItemCompra(
              item.descricaoOriginal
            )
          )
          .filter(Boolean)
      ),
    ];

    if (chaves.length === 0) {
      return;
    }

    const memorias =
      await this.repository.buscarMemoriasClassificacao(
        entrada.fornecedorId,
        chaves
      );

    const itensPorInsumo = new Map<
      string,
      string[]
    >();

    for (const memoria of memorias) {
      if (!memoria.insumoId) {
        continue;
      }

      const ids = entrada.itens
        .filter(
          (item) =>
            normalizarDescricaoItemCompra(
              item.descricaoOriginal
            ) ===
            memoria.descricaoNormalizada
        )
        .map((item) => item.id);

      itensPorInsumo.set(memoria.insumoId, [
        ...(itensPorInsumo.get(
          memoria.insumoId
        ) ?? []),
        ...ids,
      ]);
    }

    for (const [insumoId, ids] of itensPorInsumo) {
      await this.repository.vincularItensAoInsumo(
        ids,
        insumoId
      );
    }
  }

  // Bloco 8C (regra 7.12): o custo do insumo passa a ser o preço da compra
  // confirmada, por unidade de compra do insumo. Frete e impostos ficam fora.
  // Compra mais antiga que a última não muda o custo. Item que não converte
  // para a unidade do insumo vira aviso e não bloqueia a entrada.
  private async aplicarCustosDaEntrada(
    entrada: EntradaCompra
  ): Promise<{ avisos: string[]; processados: number }> {
    const avisos: string[] = [];

    let processados = 0;

    const itens = entrada.itens.filter(
      (item) =>
        ehDestinoComInsumo(item.destino) && item.insumoId
    );

    if (itens.length === 0) {
      return { avisos, processados };
    }

    const jaRegistrados = new Map(
      (
        await this.repository.buscarHistoricoDosItens(
          itens.map((item) => item.id)
        )
      ).map((registro) => [
        registro.entradaCompraItemId,
        registro,
      ])
    );

    const dataCompra =
      entrada.dataDocumento ?? entrada.dataEntrada;

    // Fator lembrado do fornecedor para os itens que não têm peso real.
    const memoriaPorChave = new Map(
      (
        await this.repository.buscarMemoriasClassificacao(
          entrada.fornecedorId,
          [
            ...new Set(
              itens.map((item) =>
                normalizarDescricaoItemCompra(
                  item.descricaoOriginal
                )
              )
            ),
          ]
        )
      ).map((memoria) => [
        memoria.descricaoNormalizada,
        memoria,
      ])
    );

    // Regra 7.25: o frete da nota é rateado entre todos os itens por valor.
    const somaItens = entrada.itens.reduce(
      (total, item) => total + item.valorTotal,
      0
    );

    const freteTotal = entrada.valorFrete > 0 ? entrada.valorFrete : 0;

    for (const item of itens) {
      if (!item.insumoId) {
        continue;
      }

      // Já tem custo registrado: garante só a entrada no estoque (idempotente),
      // que cobre as compras confirmadas antes do estoque existir.
      if (jaRegistrados.has(item.id)) {
        if (
          item.quantidadeConvertida !== undefined &&
          item.unidadeConvertida
        ) {
          try {
            await this.estoque?.registrarEntrada({
              entradaCompraItemId: item.id,
              insumoId: item.insumoId,
              quantidade: item.quantidadeConvertida,
              unidade: item.unidadeConvertida,
              custoUnitario:
                jaRegistrados.get(item.id)?.precoPorUnidade ?? 0,
              documento: entrada.numeroDocumento,
            });
          } catch {
            // o estoque não bloqueia a compra
          }
        }

        continue;
      }

      try {
        const insumo =
          await this.insumoRepository.buscarPorId(
            item.insumoId
          );

        if (!insumo || !insumo.unidadeCompraAbreviacao) {
          avisos.push(
            `${item.descricaoOriginal}: insumo não encontrado; o custo não mudou.`
          );

          continue;
        }

        const resultado = calcularCustoDaCompra(
          {
            quantidade: item.quantidade,
            unidade: item.unidade,
            valorTotal: item.valorTotal,
            freteRateado:
              somaItens > 0
                ? (freteTotal * item.valorTotal) / somaItens
                : 0,
            quantidadeReal: item.quantidadeReal,
            unidadeReal: item.unidadeReal,
            fatorQuantidade: memoriaPorChave.get(
              normalizarDescricaoItemCompra(item.descricaoOriginal)
            )?.fatorQuantidade,
            fatorUnidade: memoriaPorChave.get(
              normalizarDescricaoItemCompra(item.descricaoOriginal)
            )?.fatorUnidade,
          },
          {
            unidadeCompra: insumo.unidadeCompraAbreviacao,
            equivalenciaQuantidade:
              insumo.equivalenciaQuantidade,
            equivalenciaUnidade: insumo.equivalenciaUnidade,
          }
        );

        if (!resultado.ok) {
          avisos.push(
            `${item.descricaoOriginal} (${insumo.nome}): ${resultado.motivo} O custo não mudou.`
          );

          continue;
        }

        await this.repository.gravarConversaoItem(
          item.id,
          resultado.quantidadeConvertida,
          resultado.unidadeConvertida
        );

        // Bloco do estoque: a compra confirmada entra no estoque do insumo.
        await this.estoque?.registrarEntrada({
          entradaCompraItemId: item.id,
          insumoId: insumo.id,
          quantidade: resultado.quantidadeConvertida,
          unidade: resultado.unidadeConvertida,
          custoUnitario: resultado.precoPorUnidade,
          documento: entrada.numeroDocumento,
        });

        const historico = ordenarHistorico(
          await this.repository.listarHistoricoPorInsumo(
            insumo.id
          )
        );

        const ultima = historico[historico.length - 1];

        await this.repository.registrarHistoricoPreco({
          insumoId: insumo.id,
          entradaCompraItemId: item.id,
          dataCompra,
          precoPorUnidade: resultado.precoPorUnidade,
          custoAnterior: insumo.custoUnitario,
        });

        processados++;

        const maisRecente =
          !ultima ||
          new Date(dataCompra).getTime() >=
            new Date(ultima.dataCompra).getTime();

        if (!maisRecente) {
          avisos.push(
            `${item.descricaoOriginal} (${insumo.nome}): a compra é anterior à última; o custo não mudou.`
          );

          continue;
        }

        await this.insumoRepository.atualizar({
          ...insumo,
          ...aplicarPrecoNoInsumo(
            insumo.quantidadeCompra,
            resultado.precoPorUnidade
          ),
          atualizadoEm: new Date().toISOString(),
        });
      } catch (erro) {
        avisos.push(
          `${item.descricaoOriginal}: não foi possível atualizar o custo (${erro instanceof Error ? erro.message : "erro desconhecido"}).`
        );
      }
    }

    return { avisos, processados };
  }

  // Ao cancelar a entrada, o custo volta para a última compra que sobrou
  // (ou para o custo que existia antes da primeira compra automática).
  private async reverterCustosDaEntrada(
    entrada: EntradaCompra
  ): Promise<void> {
    const ids = entrada.itens.map((item) => item.id);

    const dosItens =
      await this.repository.buscarHistoricoDosItens(ids);

    if (dosItens.length === 0) {
      return;
    }

    const idsRemovidos = new Set(
      dosItens.map((registro) => registro.id)
    );

    const insumoIds = [
      ...new Set(dosItens.map((registro) => registro.insumoId)),
    ];

    for (const insumoId of insumoIds) {
      const todos = ordenarHistorico(
        await this.repository.listarHistoricoPorInsumo(insumoId)
      );

      const restantes = todos.filter(
        (registro) => !idsRemovidos.has(registro.id)
      );

      // O custo de antes da primeira compra automática fica guardado na
      // primeira linha gravada; se ela sair, passa para a próxima.
      const porGravacao = [...todos].sort(
        (a, b) =>
          new Date(a.criadoEm).getTime() -
          new Date(b.criadoEm).getTime()
      );

      const primeira = porGravacao[0];

      const proximaGravada = porGravacao.find(
        (registro) => !idsRemovidos.has(registro.id)
      );

      if (idsRemovidos.has(primeira.id) && proximaGravada) {
        await this.repository.atualizarCustoAnteriorHistorico(
          proximaGravada.id,
          primeira.custoAnterior
        );
      }

      const eraAUltima = idsRemovidos.has(
        todos[todos.length - 1].id
      );

      if (!eraAUltima) {
        continue;
      }

      const insumo =
        await this.insumoRepository.buscarPorId(insumoId);

      if (!insumo) {
        continue;
      }

      const preco =
        restantes.length > 0
          ? restantes[restantes.length - 1].precoPorUnidade
          : primeira.custoAnterior;

      await this.insumoRepository.atualizar({
        ...insumo,
        ...aplicarPrecoNoInsumo(insumo.quantidadeCompra, preco),
        atualizadoEm: new Date().toISOString(),
      });
    }

    await this.repository.removerHistoricoDosItens(ids);
  }

  // Recalcula o custo a partir das compras já confirmadas, da mais antiga
  // para a mais nova. Itens que já têm histórico não são refeitos.
  async recalcularCustosDasCompras(): Promise<{
    itensProcessados: number;
    avisos: string[];
  }> {
    const entradas = (await this.repository.listar())
      .filter((entrada) => entrada.status === "CONFIRMADA")
      .sort(
        (a, b) =>
          new Date(a.dataDocumento ?? a.dataEntrada).getTime() -
          new Date(b.dataDocumento ?? b.dataEntrada).getTime()
      );

    const avisos: string[] = [];

    let itensProcessados = 0;

    for (const entrada of entradas) {
      const resultado =
        await this.aplicarCustosDaEntrada(entrada);

      avisos.push(...resultado.avisos);

      itensProcessados += resultado.processados;
    }

    return { itensProcessados, avisos };
  }

  // Histórico de preços do insumo, da compra mais nova para a mais antiga.
  async listarHistoricoPrecosInsumo(
    insumoId: string
  ): Promise<HistoricoPrecoInsumoRegistro[]> {
    return ordenarHistorico(
      await this.repository.listarHistoricoPorInsumo(insumoId)
    ).reverse();
  }

  // Bloco 8A: itens de compras confirmadas, com o insumo ligado (ou não).
  async listarVinculosCompra(): Promise<
    VinculoItemCompra[]
  > {
    const [memorias, entradas] =
      await Promise.all([
        this.repository.listarMemoriasClassificacao(),
        this.repository.listar(),
      ]);

    return memorias
      .filter((memoria) =>
        ehDestinoComInsumo(memoria.destino)
      )
      .map((memoria) =>
        montarVinculo(memoria, entradas)
      );
  }

  // Liga (ou desliga, com null) o insumo de um item do fornecedor.
  // Vale para as próximas compras e para as já confirmadas.
  async vincularItemCompraAoInsumo(
    memoriaId: string,
    insumoId: string | null
  ): Promise<VinculoItemCompra> {
    const memoria =
      await this.repository.buscarMemoriaClassificacaoPorId(
        memoriaId
      );

    if (!memoria) {
      throw new Error(
        "Item de compra não encontrado."
      );
    }

    if (!ehDestinoComInsumo(memoria.destino)) {
      throw new Error(
        "Somente itens com destino Insumo ou Embalagem podem ser ligados a um insumo."
      );
    }

    if (insumoId !== null) {
      const insumo =
        await this.insumoRepository.buscarPorId(
          insumoId
        );

      if (!insumo) {
        throw new Error(
          "Insumo não encontrado."
        );
      }

      if (!insumo.ativo) {
        throw new Error(
          "Insumo inativo não pode receber itens de compra."
        );
      }
    }

    const atualizada =
      await this.repository.vincularMemoriaAoInsumo(
        memoriaId,
        insumoId
      );

    const entradas =
      await this.repository.listar();

    const itemIds = entradas
      .filter(
        (entrada) =>
          entrada.status === "CONFIRMADA" &&
          entrada.fornecedorId ===
            memoria.fornecedorId
      )
      .flatMap((entrada) => entrada.itens)
      .filter(
        (item) =>
          normalizarDescricaoItemCompra(
            item.descricaoOriginal
          ) === memoria.descricaoNormalizada
      )
      .map((item) => item.id);

    await this.repository.vincularItensAoInsumo(
      itemIds,
      insumoId
    );

    return montarVinculo(atualizada, entradas);
  }

  async classificarItens(
    entradaId: string,
    itens: ClassificacaoItemInput[]
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

    // Regra 9.10: classificação só no rascunho.
    if (existente.status !== "RASCUNHO") {
      throw new Error(
        "Somente entradas em RASCUNHO podem ter os itens classificados."
      );
    }

    if (itens.length === 0) {
      throw new Error(
        "Informe ao menos um item para classificar."
      );
    }

    const idsItens = new Set(
      existente.itens.map((item) => item.id)
    );

    const vistos = new Set<string>();

    for (const item of itens) {
      if (!idsItens.has(item.itemId)) {
        throw new Error(
          "Item não pertence a esta entrada de compra."
        );
      }

      if (vistos.has(item.itemId)) {
        throw new Error(
          "Item informado mais de uma vez."
        );
      }

      vistos.add(item.itemId);

      if (
        item.destino !== null &&
        !ehDestinoItemCompra(item.destino)
      ) {
        throw new Error(
          "Destino do item inválido."
        );
      }

      const temQuantidade =
        item.quantidadeReal !== undefined &&
        item.quantidadeReal !== null;

      const temUnidade = Boolean(item.unidadeReal?.trim());

      if (temQuantidade !== temUnidade) {
        throw new Error(
          "Informe a quantidade real e a unidade juntas."
        );
      }

      if (
        temQuantidade &&
        (!Number.isFinite(item.quantidadeReal) ||
          (item.quantidadeReal as number) <= 0)
      ) {
        throw new Error(
          "A quantidade real deve ser maior que zero."
        );
      }

      if (item.lembrarFator && (!temQuantidade || !item.destino)) {
        throw new Error(
          "Para lembrar o fator, informe a quantidade real com a unidade e o destino do item."
        );
      }
    }

    // Regra 9.9: na entrada, o item recebe só o destino.
    const resultado = await this.repository.classificarItens(
      entradaId,
      itens.map((item) => ({
        itemId: item.itemId,
        destino: item.destino,
        quantidadeReal: item.quantidadeReal,
        unidadeReal:
          item.quantidadeReal === null ? null : item.unidadeReal?.trim(),
      }))
    );

    // Fator fixo: 1 unidade do item = quantidade real / quantidade da nota.
    for (const entrada of itens) {
      if (!entrada.lembrarFator || !entrada.destino) {
        continue;
      }

      const item = existente.itens.find(
        (candidato) => candidato.id === entrada.itemId
      );

      const chave = item
        ? normalizarDescricaoItemCompra(item.descricaoOriginal)
        : "";

      if (!item || !chave || !(item.quantidade > 0)) {
        continue;
      }

      await this.repository.salvarFatorMemoria({
        fornecedorId: existente.fornecedorId,
        descricaoNormalizada: chave,
        destino: entrada.destino,
        fatorQuantidade:
          Math.round(
            ((entrada.quantidadeReal as number) / item.quantidade) *
              10000
          ) / 10000,
        fatorUnidade: (entrada.unidadeReal as string).trim(),
      });
    }

    return resultado;
  }

  // Regra 9.13: diz, para cada item, se ele já é conhecido do fornecedor
  // e sugere o destino dos itens ainda não classificados.
  async identificarItens(
    entradaId: string
  ): Promise<IdentificacaoItemCompra[]> {
    const entrada =
      await this.repository.buscarPorId(
        entradaId
      );

    if (!entrada) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    if (entrada.itens.length === 0) {
      return [];
    }

    const chaves = entrada.itens.map((item) => ({
      item,
      chave: normalizarDescricaoItemCompra(
        item.descricaoOriginal
      ),
    }));

    const memorias =
      await this.repository.buscarMemoriasClassificacao(
        entrada.fornecedorId,
        [
          ...new Set(
            chaves
              .map(({ chave }) => chave)
              .filter(Boolean)
          ),
        ]
      );

    const memoriaPorChave = new Map(
      memorias.map((memoria) => [
        memoria.descricaoNormalizada,
        memoria,
      ])
    );

    const precisaPadrao = chaves.some(
      ({ item, chave }) =>
        !item.destino &&
        !memoriaPorChave.has(chave)
    );

    const fornecedor = precisaPadrao
      ? await this.fornecedorRepository.buscarPorId(
          entrada.fornecedorId
        )
      : undefined;

    const destinoPadrao =
      ehDestinoItemCompra(
        fornecedor?.destinoPadrao
      )
        ? fornecedor.destinoPadrao
        : undefined;

    return chaves.map(({ item, chave }) => {
      const memoria = memoriaPorChave.get(chave);

      const identificacao: IdentificacaoItemCompra =
        {
          itemId: item.id,
          chave,
          conhecido: Boolean(memoria),
        };

      if (memoria?.fatorQuantidade && memoria.fatorUnidade) {
        identificacao.fator = {
          quantidade: memoria.fatorQuantidade,
          unidade: memoria.fatorUnidade,
        };
      }

      if (!item.destino) {
        if (memoria) {
          identificacao.destinoSugerido =
            memoria.destino;
          identificacao.origem = "MEMORIA";
        } else if (destinoPadrao) {
          identificacao.destinoSugerido =
            destinoPadrao;
          identificacao.origem =
            "PADRAO_FORNECEDOR";
        }
      }

      return identificacao;
    });
  }

  async cancelarEntradaCompra(
    entradaId: string,
    motivo: string,
    operador?: string | null
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

    const resultadoCancelamento =
      await this.repository.atualizar(cancelada);

    // Bloco 8C: o custo volta para a compra anterior.
    await this.reverterCustosDaEntrada(existente);

    // O que entrou no estoque por esta compra sai de volta.
    await this.estoque?.estornarEntradas(
      existente.itens.map((item) => item.id),
      operador
    );

    await this.estoque?.registrarAtividade({
      acao: "CANCELADA",
      resumo: `Entrada de compra${existente.numeroDocumento ? ` ${existente.numeroDocumento}` : ""} cancelada. Motivo: ${motivo.trim()}`,
      referenciaId: existente.id,
      referenciaNumero: existente.numeroDocumento,
      operador,
    });

    return resultadoCancelamento;
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