import {
  ClassificacaoItemInput,
  EntradaCompra,
  EntradaCompraItem,
  MemoriaClassificacaoItemCompra,
  MemoriaClassificacaoRegistro,
  TipoDocumentoEntradaCompra,
} from "../types/entradaCompra";

import {
  EntradaCompraDocumento,
} from "../types/entradaCompraDocumento";

import {
  EntradaCompraService,
} from "./entradaCompraService";

import {
  EntradaCompraRepositoryPort,
} from "../repositories/entradaCompraRepositoryPort";

import {
  FornecedorRepositoryPort,
} from "@/modules/fornecedores/repositories/fornecedorRepositoryPort";

import {
  Fornecedor,
} from "@/modules/fornecedores/types/fornecedor";

import {
  InsumoRepositoryPort,
} from "@/modules/insumos/repositories/insumoRepositoryPort";

import {
  Insumo,
} from "@/modules/insumos/types/insumo";

class EntradaCompraRepositoryFake
  implements EntradaCompraRepositoryPort
{
  private entradas: EntradaCompra[] = [];

  memorias: (MemoriaClassificacaoItemCompra & {
    id: string;
    vezesUsada: number;
  })[] = [];

  async listarMemoriasClassificacao(): Promise<
    MemoriaClassificacaoRegistro[]
  > {
    return this.memorias.map((memoria) => ({
      ...memoria,
    }));
  }

  async buscarMemoriaClassificacaoPorId(
    id: string
  ): Promise<
    MemoriaClassificacaoRegistro | undefined
  > {
    return this.memorias.find(
      (memoria) => memoria.id === id
    );
  }

  async vincularMemoriaAoInsumo(
    id: string,
    insumoId: string | null
  ): Promise<MemoriaClassificacaoRegistro> {
    const memoria = this.memorias.find(
      (item) => item.id === id
    );

    if (!memoria) {
      throw new Error(
        "Item de compra não encontrado."
      );
    }

    memoria.insumoId = insumoId ?? undefined;

    return memoria;
  }

  async vincularItensAoInsumo(
    itemIds: string[],
    insumoId: string | null
  ): Promise<void> {
    for (const entrada of this.entradas) {
      for (const item of entrada.itens) {
        if (itemIds.includes(item.id)) {
          item.insumoId = insumoId ?? undefined;
        }
      }
    }
  }

  async classificarItens(
    entradaId: string,
    itens: ClassificacaoItemInput[]
  ): Promise<EntradaCompra> {
    const entrada =
      this.entradas.find(
        (item) => item.id === entradaId
      );

    if (!entrada) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    entrada.itens = entrada.itens.map((item) => {
      const classificacao = itens.find(
        (c) => c.itemId === item.id
      );

      return classificacao
        ? {
            ...item,
            destino:
              classificacao.destino ?? undefined,
          }
        : item;
    });

    return entrada;
  }

  async buscarMemoriasClassificacao(
    fornecedorId: string,
    descricoesNormalizadas: string[]
  ): Promise<MemoriaClassificacaoItemCompra[]> {
    return this.memorias.filter(
      (memoria) =>
        memoria.fornecedorId === fornecedorId &&
        descricoesNormalizadas.includes(
          memoria.descricaoNormalizada
        )
    );
  }

  async registrarMemoriasClassificacao(
    memorias: MemoriaClassificacaoItemCompra[]
  ): Promise<void> {
    for (const memoria of memorias) {
      const existente = this.memorias.find(
        (item) =>
          item.fornecedorId === memoria.fornecedorId &&
          item.descricaoNormalizada ===
            memoria.descricaoNormalizada
      );

      if (existente) {
        existente.destino = memoria.destino;
        existente.vezesUsada += 1;
      } else {
        this.memorias.push({
          ...memoria,
          id: crypto.randomUUID(),
          vezesUsada: 1,
        });
      }
    }
  }

  async criar(
    entrada: EntradaCompra
  ): Promise<EntradaCompra> {
    this.entradas.push(
      entrada
    );

    return entrada;
  }

  async buscarPorId(
    id: string
  ): Promise<
    EntradaCompra | undefined
  > {
    return this.entradas.find(
      (entrada) =>
        entrada.id === id
    );
  }

  async listar(): Promise<
    EntradaCompra[]
  > {
    return this.entradas;
  }

  async buscarPorChaveAcesso(
    chaveAcesso: string
  ): Promise<EntradaCompra[]> {
    return this.entradas.filter(
      (entrada) =>
        entrada.chaveAcesso === chaveAcesso
    );
  }

  async atualizar(
    entrada: EntradaCompra
  ): Promise<EntradaCompra> {
    const index =
      this.entradas.findIndex(
        (item) =>
          item.id === entrada.id
      );

    if (index === -1) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    this.entradas[index] =
      entrada;

    return entrada;
  }

  async remover(
    id: string
  ): Promise<void> {
    this.entradas =
      this.entradas.filter(
        (entrada) =>
          entrada.id !== id
      );
  }

  async adicionarDocumento(
    documento: EntradaCompraDocumento
  ): Promise<EntradaCompraDocumento> {
    const entrada =
      await this.buscarPorId(
        documento.entradaCompraId
      );

    if (!entrada) {
      throw new Error(
        "Entrada de compra não encontrada."
      );
    }

    const entradaAtualizada:
      EntradaCompra = {
        ...entrada,

        documentos: [
          ...entrada.documentos,
          documento,
        ],

        atualizadoEm:
          new Date().toISOString(),
      };

    await this.atualizar(
      entradaAtualizada
    );

    return documento;
  }

  async removerDocumento(id: string): Promise<void> {
    for (const entrada of this.entradas) {
      const possuiDocumento =
        entrada.documentos.some(
          (documento) => documento.id === id
        );

      if (!possuiDocumento) {
        continue;
      }

      entrada.documentos =
        entrada.documentos.filter(
          (documento) => documento.id !== id
        );

      entrada.atualizadoEm =
        new Date().toISOString();

      return;
    }

    throw new Error(
      "Documento da entrada de compra não encontrado."
    );
  }

    async buscarDocumentoPorId(
    id: string
  ): Promise<EntradaCompraDocumento | undefined> {
    for (const entrada of this.entradas) {
      const documento =
        entrada.documentos.find(
          (item) => item.id === id
        );

      if (documento) {
        return documento;
      }
    }

    return undefined;
  }
}

class FornecedorRepositoryFake
  implements FornecedorRepositoryPort
{
  constructor(
    private readonly fornecedores: Fornecedor[]
  ) {}

  async criar(
    fornecedor: Fornecedor
  ): Promise<Fornecedor> {
    this.fornecedores.push(
      fornecedor
    );

    return fornecedor;
  }

  async buscarPorId(
    id: string
  ): Promise<
    Fornecedor | undefined
  > {
    return this.fornecedores.find(
      (fornecedor) =>
        fornecedor.id === id
    );
  }

  async buscarPorCpf(
    cpf: string
  ): Promise<
    Fornecedor | undefined
  > {
    const normalizado =
      cpf.replace(/\D/g, "");

    return this.fornecedores.find(
      (fornecedor) =>
        fornecedor.cpf ===
        normalizado
    );
  }

  async buscarPorCnpj(
    cnpj: string
  ): Promise<
    Fornecedor | undefined
  > {
    const normalizado =
      cnpj.replace(/\D/g, "");

    return this.fornecedores.find(
      (fornecedor) =>
        fornecedor.cnpj ===
        normalizado
    );
  }

  async listar(): Promise<
    Fornecedor[]
  > {
    return this.fornecedores;
  }

  async atualizar(
    fornecedor: Fornecedor
  ): Promise<Fornecedor> {
    const index =
      this.fornecedores.findIndex(
        (item) =>
          item.id ===
          fornecedor.id
      );

    if (index === -1) {
      throw new Error(
        "Fornecedor não encontrado."
      );
    }

    this.fornecedores[index] =
      fornecedor;

    return fornecedor;
  }

  async remover(
    id: string
  ): Promise<void> {
    const index =
      this.fornecedores.findIndex(
        (fornecedor) =>
          fornecedor.id === id
      );

    if (index !== -1) {
      this.fornecedores.splice(
        index,
        1
      );
    }
  }
}

function criarFornecedor(): Fornecedor {
  return {
    id:
      crypto.randomUUID(),

    razaoSocial:
      "Fornecedor Teste",

    nomeFantasia:
      "Fornecedor Teste",

    cnpj:
      "12345678000190",

    telefone:
      "92999999999",

    email:
      "teste@fornecedor.com",

    observacao:
      "Fornecedor usado nos testes.",

    criadoEm:
      new Date().toISOString(),

    atualizadoEm:
      new Date().toISOString(),

    ativo: true,
  };
}

function criarItem(
  entradaCompraId: string,
  valores?: Partial<EntradaCompraItem>
): EntradaCompraItem {
  return {
    id:
      valores?.id ??
      crypto.randomUUID(),

    entradaCompraId,

    descricaoOriginal:
      valores?.descricaoOriginal ??
      "Queijo coalho de búfala",

    quantidade:
      valores?.quantidade ??
      2,

    unidade:
      valores?.unidade ??
      "KG",

    valorUnitario:
      valores?.valorUnitario ??
      35,

    desconto:
      valores?.desconto ??
      0,

    valorTotal:
      valores?.valorTotal ??
      70,

    codigoFornecedor:
      valores?.codigoFornecedor,

    lote:
      valores?.lote,

    validade:
      valores?.validade,

    observacao:
      valores?.observacao,

    criadoEm:
      valores?.criadoEm ??
      new Date().toISOString(),

    atualizadoEm:
      valores?.atualizadoEm ??
      new Date().toISOString(),
  };
}

function criarEntrada(
  fornecedorId: string,
  valores?: Partial<EntradaCompra>
): EntradaCompra {
  const id =
    valores?.id ??
    crypto.randomUUID();

  const item =
    valores?.itens?.[0] ??
    criarItem(id);

  return {
    id,

    fornecedorId,

    tipoDocumento:
      valores?.tipoDocumento ??
      "NOTA_FISCAL",

    status:
      valores?.status ??
      "RASCUNHO",

    numeroDocumento:
      valores?.numeroDocumento ??
      "TESTE-001",

    serie:
      valores?.serie ??
      "1",

    chaveAcesso:
      valores?.chaveAcesso,

    dataDocumento:
      valores?.dataDocumento ??
      new Date().toISOString(),

    dataEntrada:
      valores?.dataEntrada ??
      new Date().toISOString(),

    valorProdutos:
      valores?.valorProdutos ??
      70,

    valorDesconto:
      valores?.valorDesconto ??
      0,

    valorFrete:
      valores?.valorFrete ??
      0,

    valorTotal:
      valores?.valorTotal ??
      70,

    documentoArquivo:
      valores?.documentoArquivo,

    observacao:
      valores?.observacao,

    itens:
      valores?.itens ??
      [item],

    documentos:
      valores?.documentos ??
      [],

    criadoEm:
      valores?.criadoEm ??
      new Date().toISOString(),

    atualizadoEm:
      valores?.atualizadoEm ??
      new Date().toISOString(),
  };
}

function criarDocumento(
  entradaCompraId: string,
  valores?: Partial<EntradaCompraDocumento>
): EntradaCompraDocumento {
  return {
    id:
      valores?.id ??
      crypto.randomUUID(),

    entradaCompraId,

    nomeArquivo:
      valores?.nomeArquivo ??
      "nota-teste.pdf",

    mimeType:
      valores?.mimeType ??
      "application/pdf",

    tamanho:
      valores?.tamanho ??
      1024,

    tipoDocumento:
      valores?.tipoDocumento ??
      "NOTA_FISCAL",

    origem:
      valores?.origem ??
      "UPLOAD",

    statusLeitura:
      valores?.statusLeitura ??
      "PENDENTE",

    caminhoArquivo:
      valores?.caminhoArquivo ??
      "/empresas/teste/entradas-compra/2026/09/nota-teste.pdf",

    hashArquivo:
      valores?.hashArquivo,

    criadoEm:
      valores?.criadoEm ??
      new Date().toISOString(),

    atualizadoEm:
      valores?.atualizadoEm ??
      new Date().toISOString(),
  };
}

class InsumoRepositoryFake
  implements InsumoRepositoryPort
{
  constructor(private readonly insumos: Insumo[]) {}

  async criar(insumo: Insumo): Promise<Insumo> {
    this.insumos.push(insumo);
    return insumo;
  }

  async buscarPorId(
    id: string
  ): Promise<Insumo | undefined> {
    return this.insumos.find(
      (insumo) => insumo.id === id
    );
  }

  async listar(): Promise<Insumo[]> {
    return this.insumos;
  }

  async atualizar(insumo: Insumo): Promise<Insumo> {
    return insumo;
  }
}

function criarInsumo(
  id: string,
  ativo = true
): Insumo {
  const agora = new Date().toISOString();

  return {
    id,
    nome: `Insumo ${id}`,
    categoriaId: "categoria",
    unidadeCompraId: "kg",
    quantidadeCompra: 1,
    precoCompra: 10,
    custoUnitario: 10,
    perdaLimpeza: 0,
    ativo,
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

function esperarErro(
  acao: () => Promise<unknown>,
  mensagemEsperada: string
): Promise<void> {
  return acao().then(
    () => {
      throw new Error(
        `Falha: esperava erro "${mensagemEsperada}".`
      );
    },
    (error) => {
      if (
        !(
          error instanceof Error
        ) ||
        error.message !==
          mensagemEsperada
      ) {
        throw error;
      }
    }
  );
}

async function executarTestes() {
  const fornecedor =
    criarFornecedor();

  const entradaRepository =
    new EntradaCompraRepositoryFake();

  const fornecedorRepository =
    new FornecedorRepositoryFake([
      fornecedor,
    ]);

  const service =
    new EntradaCompraService(
      entradaRepository,
      fornecedorRepository,
      new InsumoRepositoryFake([
        criarInsumo("insumo-bacon"),
        criarInsumo("insumo-inativo", false),
      ])
    );

  // --------------------------------------------------
  // CRIAÇÃO
  // --------------------------------------------------

  const entrada =
    criarEntrada(
      fornecedor.id
    );

  const criada =
    await service.criarEntradaCompra({
      entrada,
    });

  if (
    criada.id !==
    entrada.id
  ) {
    throw new Error(
      "Falha na criação da entrada."
    );
  }

  if (
    criada.status !==
    "RASCUNHO"
  ) {
    throw new Error(
      "Falha: nova entrada não foi criada como RASCUNHO."
    );
  }

  if (
    criada.itens.length !== 1
  ) {
    throw new Error(
      "Falha: item da entrada não foi preservado."
    );
  }

  if (
    criada.documentos.length !== 0
  ) {
    throw new Error(
      "Falha: nova entrada deveria iniciar sem documentos."
    );
  }

  // --------------------------------------------------
  // VALIDAÇÕES
  // --------------------------------------------------

  await esperarErro(
    () =>
      service.criarEntradaCompra({
        entrada:
          criarEntrada(
            "fornecedor-inexistente"
          ),
      }),
    "Fornecedor não encontrado."
  );

  await esperarErro(
    () =>
      service.criarEntradaCompra({
        entrada:
          criarEntrada(
            fornecedor.id,
            {
              tipoDocumento:
                "INVALIDO" as TipoDocumentoEntradaCompra,
            }
          ),
      }),
    "Tipo de documento da entrada de compra inválido."
  );

  await esperarErro(
    () =>
      service.criarEntradaCompra({
        entrada:
          criarEntrada(
            fornecedor.id,
            {
              itens: [],
            }
          ),
      }),
    "A entrada de compra precisa ter pelo menos um item."
  );

  const entradaQuantidadeInvalida =
    criarEntrada(
      fornecedor.id
    );

  entradaQuantidadeInvalida.itens =
    [
      criarItem(
        entradaQuantidadeInvalida.id,
        {
          quantidade: 0,
          valorTotal: 0,
        }
      ),
    ];

  entradaQuantidadeInvalida.valorProdutos =
    0;

  entradaQuantidadeInvalida.valorTotal =
    0;

  await esperarErro(
    () =>
      service.criarEntradaCompra({
        entrada:
          entradaQuantidadeInvalida,
      }),
    "A quantidade do item deve ser maior que zero."
  );

  const entradaValorInvalido =
    criarEntrada(
      fornecedor.id
    );

  entradaValorInvalido.itens =
    [
      criarItem(
        entradaValorInvalido.id,
        {
          valorUnitario: -1,
          valorTotal: -2,
        }
      ),
    ];

  await esperarErro(
    () =>
      service.criarEntradaCompra({
        entrada:
          entradaValorInvalido,
      }),
    "O valor unitário do item é inválido."
  );

  const entradaDescontoInvalido =
    criarEntrada(
      fornecedor.id
    );

  entradaDescontoInvalido.itens =
    [
      criarItem(
        entradaDescontoInvalido.id,
        {
          desconto: -1,
        }
      ),
    ];

  await esperarErro(
    () =>
      service.criarEntradaCompra({
        entrada:
          entradaDescontoInvalido,
      }),
    "O desconto do item é inválido."
  );

  const entradaTotalItemInvalido =
    criarEntrada(
      fornecedor.id
    );

  entradaTotalItemInvalido.itens =
    [
      criarItem(
        entradaTotalItemInvalido.id,
        {
          quantidade: 2,
          valorUnitario: 35,
          desconto: 0,
          valorTotal: 60,
        }
      ),
    ];

  await esperarErro(
    () =>
      service.criarEntradaCompra({
        entrada:
          entradaTotalItemInvalido,
      }),
    "O valor total do item não corresponde à quantidade, valor unitário e desconto informados."
  );

  const entradaProdutosInvalido =
    criarEntrada(
      fornecedor.id
    );

  entradaProdutosInvalido.valorProdutos =
    80;

  entradaProdutosInvalido.valorTotal =
    80;

  await esperarErro(
    () =>
      service.criarEntradaCompra({
        entrada:
          entradaProdutosInvalido,
      }),
    "O valor dos produtos da entrada não corresponde à soma dos itens."
  );

  const entradaTotalInvalido =
    criarEntrada(
      fornecedor.id
    );

  entradaTotalInvalido.valorDesconto =
    10;

  entradaTotalInvalido.valorTotal =
    70;

  await esperarErro(
    () =>
      service.criarEntradaCompra({
        entrada:
          entradaTotalInvalido,
      }),
    "O valor total da entrada não corresponde aos itens, desconto e frete informados."
  );

  // --------------------------------------------------
  // ATUALIZAÇÃO DE RASCUNHO
  // --------------------------------------------------

  const entradaAtualizada =
    {
      ...criada,

      observacao:
        "Entrada atualizada no teste.",

      atualizadoEm:
        new Date().toISOString(),
    };

  const atualizada =
    await service.atualizarEntradaCompra({
      entrada:
        entradaAtualizada,
    });

  if (
    atualizada.observacao !==
    "Entrada atualizada no teste."
  ) {
    throw new Error(
      "Falha na atualização da entrada."
    );
  }

  if (
    atualizada.status !==
    "RASCUNHO"
  ) {
    throw new Error(
      "Falha: atualização alterou indevidamente o status."
    );
  }

  // --------------------------------------------------
  // DOCUMENTO
  // --------------------------------------------------

  const documento =
    criarDocumento(
      criada.id
    );

  const documentoAdicionado =
    await service.adicionarDocumento(
      documento
    );

  if (
    documentoAdicionado.id !==
    documento.id
  ) {
    throw new Error(
      "Falha: ID do documento não foi preservado."
    );
  }

  const entradaComDocumento =
    await service.buscarPorId(
      criada.id
    );

  if (
    !entradaComDocumento
  ) {
    throw new Error(
      "Falha: entrada não encontrada após adicionar documento."
    );
  }

  if (
    entradaComDocumento.documentos.length !==
    1
  ) {
    throw new Error(
      "Falha: documento não foi associado à entrada."
    );
  }

  if (
    entradaComDocumento.documentos[0]?.id !==
    documento.id
  ) {
    throw new Error(
      "Falha: identidade do documento não foi preservada."
    );
  }

  await esperarErro(
    () =>
      service.adicionarDocumento(
        criarDocumento(
          "entrada-inexistente"
        )
      ),
    "Entrada de compra não encontrada."
  );

  // --------------------------------------------------
  // CLASSIFICAÇÃO DOS ITENS (regras 9.8 a 9.10)
  // --------------------------------------------------

  const itemId = criada.itens[0].id;

  await esperarErro(
    () =>
      service.confirmarEntradaCompra(
        criada.id
      ),
    "Classifique o destino de todos os itens antes de confirmar a entrada."
  );

  // Item novo: sem memória, a sugestão vem do destino padrão do fornecedor.
  fornecedor.destinoPadrao = "INSUMO";

  const identificacaoInicial =
    await service.identificarItens(criada.id);

  if (
    identificacaoInicial.length !== 1 ||
    identificacaoInicial[0].conhecido ||
    identificacaoInicial[0].chave !==
      "QUEIJO COALHO DE BUFALA" ||
    identificacaoInicial[0].origem !==
      "PADRAO_FORNECEDOR" ||
    identificacaoInicial[0].destinoSugerido !==
      "INSUMO"
  ) {
    throw new Error(
      "Falha: identificação de item novo com destino padrão."
    );
  }

  await esperarErro(
    () =>
      service.classificarItens(criada.id, [
        {
          itemId,
          destino:
            "PATRIMONIO" as unknown as "INSUMO",
        },
      ]),
    "Destino do item inválido."
  );

  await esperarErro(
    () =>
      service.classificarItens(criada.id, [
        {
          itemId: "item-de-outra-entrada",
          destino: "SERVICO",
        },
      ]),
    "Item não pertence a esta entrada de compra."
  );

  await esperarErro(
    () =>
      service.classificarItens(criada.id, [
        { itemId, destino: "SERVICO" },
        { itemId, destino: "INSUMO" },
      ]),
    "Item informado mais de uma vez."
  );

  // Regra 9.9: o destino basta, sem insumo ligado.
  const classificada =
    await service.classificarItens(criada.id, [
      {
        itemId,
        destino: "INSUMO",
      },
    ]);

  if (
    classificada.itens[0].destino !== "INSUMO" ||
    classificada.itens[0].insumoId !== undefined ||
    classificada.itens[0].id !== itemId
  ) {
    throw new Error(
      "Falha: classificação do item não foi gravada."
    );
  }

  const identificacaoClassificada =
    await service.identificarItens(criada.id);

  if (
    identificacaoClassificada[0].destinoSugerido !==
    undefined
  ) {
    throw new Error(
      "Falha: item já classificado não deve receber sugestão."
    );
  }

  if (entradaRepository.memorias.length !== 0) {
    throw new Error(
      "Falha: a memória só deve aprender na confirmação."
    );
  }

  // --------------------------------------------------
  // CONFIRMAÇÃO
  // --------------------------------------------------

  const confirmada =
    await service.confirmarEntradaCompra(
      criada.id
    );

  if (
    confirmada.status !==
    "CONFIRMADA"
  ) {
    throw new Error(
      "Falha: entrada não foi confirmada."
    );
  }

  if (
    confirmada.id !==
    criada.id
  ) {
    throw new Error(
      "Falha: confirmação alterou o ID da entrada."
    );
  }

  if (
    confirmada.itens[0]?.id !==
    criada.itens[0]?.id
  ) {
    throw new Error(
      "Falha: confirmação alterou o ID do item."
    );
  }

  if (
    confirmada.documentos[0]?.id !==
    documento.id
  ) {
    throw new Error(
      "Falha: confirmação alterou o ID do documento."
    );
  }

  // --------------------------------------------------
  // MEMÓRIA DE CLASSIFICAÇÃO (regra 9.13)
  // --------------------------------------------------

  if (
    (entradaRepository.memorias.length as number) !== 1 ||
    entradaRepository.memorias[0]
      .descricaoNormalizada !==
      "QUEIJO COALHO DE BUFALA" ||
    entradaRepository.memorias[0].destino !==
      "INSUMO" ||
    entradaRepository.memorias[0].vezesUsada !== 1
  ) {
    throw new Error(
      "Falha: memória não foi registrada na confirmação."
    );
  }

  await esperarErro(
    () =>
      service.classificarItens(criada.id, [
        {
          itemId,
          destino: "SERVICO",
        },
      ]),
    "Somente entradas em RASCUNHO podem ter os itens classificados."
  );

  // Nova entrada do mesmo fornecedor, com o item escrito de outro jeito:
  // é reconhecida pela chave, e a memória tem prioridade sobre o padrão.
  fornecedor.destinoPadrao = "SERVICO";

  const segundaEntrada =
    await service.criarEntradaCompra({
      entrada: criarEntrada(fornecedor.id, {
        itens: [
          criarItem("segunda", {
            descricaoOriginal:
              "  queijo  COALHO de búfala. ",
          }),
        ],
      }),
    });

  const identificacaoSegunda =
    await service.identificarItens(
      segundaEntrada.id
    );

  if (
    identificacaoSegunda.length !== 1 ||
    !identificacaoSegunda[0].conhecido ||
    identificacaoSegunda[0].origem !== "MEMORIA" ||
    identificacaoSegunda[0].destinoSugerido !==
      "INSUMO"
  ) {
    throw new Error(
      "Falha: item conhecido não foi identificado pela memória."
    );
  }

  // --------------------------------------------------
  // BLOQUEIO DE DOCUMENTO APÓS CONFIRMAÇÃO
  // --------------------------------------------------

  await esperarErro(
    () =>
      service.adicionarDocumento(
        criarDocumento(
          criada.id,
          {
            nomeArquivo:
              "outro-documento.pdf",
          }
        )
      ),
    "Somente entradas em RASCUNHO podem receber documentos."
  );

  // --------------------------------------------------
  // BLOQUEIO DE ALTERAÇÃO APÓS CONFIRMAÇÃO
  // --------------------------------------------------

  await esperarErro(
    () =>
      service.atualizarEntradaCompra({
        entrada:
          {
            ...confirmada,

            observacao:
              "Tentativa de alteração após confirmação.",
          },
      }),
    "Apenas entradas em RASCUNHO podem ser alteradas."
  );

  // --------------------------------------------------
  // BLOQUEIO DE NOVA CONFIRMAÇÃO
  // --------------------------------------------------

  await esperarErro(
    () =>
      service.confirmarEntradaCompra(
        criada.id
      ),
    "Somente entradas em RASCUNHO podem ser confirmadas."
  );

  // --------------------------------------------------
  // CANCELAMENTO SEM MOTIVO
  // --------------------------------------------------

  await esperarErro(
    () =>
      service.cancelarEntradaCompra(
        criada.id,
        "   "
      ),
    "O motivo do cancelamento é obrigatório."
  );

  // --------------------------------------------------
  // CANCELAMENTO
  // --------------------------------------------------

  const cancelada =
    await service.cancelarEntradaCompra(
      criada.id,
      "Erro no lançamento da compra."
    );

  if (
    cancelada.status !==
    "CANCELADA"
  ) {
    throw new Error(
      "Falha: entrada não foi cancelada."
    );
  }

  if (
    cancelada.id !==
    criada.id
  ) {
    throw new Error(
      "Falha: cancelamento alterou o ID da entrada."
    );
  }

  if (
    cancelada.itens[0]?.id !==
    criada.itens[0]?.id
  ) {
    throw new Error(
      "Falha: cancelamento alterou o ID do item."
    );
  }

  if (
    cancelada.documentos[0]?.id !==
    documento.id
  ) {
    throw new Error(
      "Falha: cancelamento alterou o ID do documento."
    );
  }

  if (
    !cancelada.observacao?.includes(
      "Erro no lançamento da compra."
    )
  ) {
    throw new Error(
      "Falha: motivo do cancelamento não foi registrado."
    );
  }

  // --------------------------------------------------
  // BLOQUEIO DE ALTERAÇÃO APÓS CANCELAMENTO
  // --------------------------------------------------

  await esperarErro(
    () =>
      service.atualizarEntradaCompra({
        entrada:
          {
            ...cancelada,

            observacao:
              "Tentativa de alteração após cancelamento.",
          },
      }),
    "Apenas entradas em RASCUNHO podem ser alteradas."
  );

  // --------------------------------------------------
  // BLOQUEIO DE CONFIRMAÇÃO APÓS CANCELAMENTO
  // --------------------------------------------------

  await esperarErro(
    () =>
      service.confirmarEntradaCompra(
        criada.id
      ),
    "Somente entradas em RASCUNHO podem ser confirmadas."
  );

  // --------------------------------------------------
  // BLOQUEIO DE CANCELAMENTO DUPLO
  // --------------------------------------------------

  await esperarErro(
    () =>
      service.cancelarEntradaCompra(
        criada.id,
        "Tentativa de segundo cancelamento."
      ),
    "Somente entradas CONFIRMADAS podem ser canceladas."
  );

  // --------------------------------------------------
  // BLOQUEIO DE REMOÇÃO APÓS CANCELAMENTO
  // --------------------------------------------------

  await esperarErro(
    () =>
      service.removerEntradaCompra(
        criada.id
      ),
    "Somente entradas em RASCUNHO podem ser removidas."
  );

  // --------------------------------------------------
  // IDENTIDADE PRESERVADA
  // --------------------------------------------------

  const existente =
    await service.buscarPorId(
      criada.id
    );

  if (!existente) {
    throw new Error(
      "Falha: entrada não foi encontrada após cancelamento."
    );
  }

  if (
    existente.id !==
    criada.id
  ) {
    throw new Error(
      "Falha: identidade da entrada foi alterada."
    );
  }

  if (
    existente.itens[0]?.id !==
    criada.itens[0]?.id
  ) {
    throw new Error(
      "Falha: identidade do item foi alterada."
    );
  }

  if (
    existente.documentos[0]?.id !==
    documento.id
  ) {
    throw new Error(
      "Falha: identidade do documento foi alterada."
    );
  }

  // --------------------------------------------------
  // VÍNCULO ITEM -> INSUMO (bloco 8A, regra 7.13)
  // --------------------------------------------------

  async function lancarEConfirmar(
    descricao: string,
    destino: "INSUMO" | "LIMPEZA_HIGIENE",
    dataEntrada: string
  ) {
    const entradaId = crypto.randomUUID();

    const lancada =
      await service.criarEntradaCompra({
        entrada: criarEntrada(fornecedor.id, {
          id: entradaId,
          numeroDocumento: `8A-${descricao}`,
          dataEntrada,
          itens: [
            criarItem(entradaId, {
              descricaoOriginal: descricao,
              quantidade: 3,
              unidade: "MANTA",
              valorUnitario: 98,
              valorTotal: 294,
            }),
          ],
          valorProdutos: 294,
          valorTotal: 294,
        }),
      });

    await service.classificarItens(entradaId, [
      { itemId: lancada.itens[0].id, destino },
    ]);

    return service.confirmarEntradaCompra(entradaId);
  }

  const baconUm = await lancarEConfirmar(
    "Bacon manta",
    "INSUMO",
    "2029-01-01T00:00:00.000Z"
  );

  await lancarEConfirmar(
    "Detergente neutro",
    "LIMPEZA_HIGIENE",
    "2029-01-02T00:00:00.000Z"
  );

  const antes = await service.listarVinculosCompra();

  const vinculoBacon = antes.find(
    (vinculo) =>
      vinculo.descricaoNormalizada === "BACON MANTA"
  );

  if (
    !vinculoBacon ||
    vinculoBacon.insumoId !== undefined ||
    vinculoBacon.descricao !== "Bacon manta" ||
    vinculoBacon.ultimaCompra?.unidade !== "MANTA" ||
    vinculoBacon.ultimaCompra.valorUnitario !== 98
  ) {
    throw new Error(
      "Falha: item de compra não apareceu sem insumo, com a última compra."
    );
  }

  if (
    antes.some(
      (vinculo) =>
        vinculo.descricaoNormalizada ===
        "DETERGENTE NEUTRO"
    )
  ) {
    throw new Error(
      "Falha: item com destino Limpeza apareceu na lista de vínculos."
    );
  }

  const ligado =
    await service.vincularItemCompraAoInsumo(
      vinculoBacon.id,
      "insumo-bacon"
    );

  if (ligado.insumoId !== "insumo-bacon") {
    throw new Error(
      "Falha: o insumo não foi ligado ao item."
    );
  }

  if (
    (await entradaRepository.buscarPorId(baconUm.id))
      ?.itens[0].insumoId !== "insumo-bacon"
  ) {
    throw new Error(
      "Falha: o vínculo não foi para o item da compra já confirmada."
    );
  }

  // Próxima compra do mesmo item, escrito de outro jeito: já nasce ligada.
  const baconDois = await lancarEConfirmar(
    "  BACON  manta. ",
    "INSUMO",
    "2030-01-01T00:00:00.000Z"
  );

  if (baconDois.itens[0].insumoId !== "insumo-bacon") {
    throw new Error(
      "Falha: a nova compra não herdou o insumo ligado."
    );
  }

  const depois = (
    await service.listarVinculosCompra()
  ).find(
    (vinculo) =>
      vinculo.descricaoNormalizada === "BACON MANTA"
  );

  if (
    depois?.ultimaCompra?.entradaId !== baconDois.id ||
    depois.vezesUsada !== 2
  ) {
    throw new Error(
      "Falha: a última compra e o contador do item não foram atualizados."
    );
  }

  await esperarErro(
    () =>
      service.vincularItemCompraAoInsumo(
        vinculoBacon.id,
        "nao-existe"
      ),
    "Insumo não encontrado."
  );

  await esperarErro(
    () =>
      service.vincularItemCompraAoInsumo(
        vinculoBacon.id,
        "insumo-inativo"
      ),
    "Insumo inativo não pode receber itens de compra."
  );

  await esperarErro(
    () =>
      service.vincularItemCompraAoInsumo(
        "memoria-inexistente",
        "insumo-bacon"
      ),
    "Item de compra não encontrado."
  );

  const memoriaDetergente =
    entradaRepository.memorias.find(
      (memoria) =>
        memoria.descricaoNormalizada ===
        "DETERGENTE NEUTRO"
    );

  await esperarErro(
    () =>
      service.vincularItemCompraAoInsumo(
        memoriaDetergente?.id ?? "",
        "insumo-bacon"
      ),
    "Somente itens com destino Insumo ou Embalagem podem ser ligados a um insumo."
  );

  // Desligar limpa o vínculo da memória e dos itens já lançados.
  const desligado =
    await service.vincularItemCompraAoInsumo(
      vinculoBacon.id,
      null
    );

  if (
    desligado.insumoId !== undefined ||
    (await entradaRepository.buscarPorId(baconUm.id))
      ?.itens[0].insumoId !== undefined ||
    (await entradaRepository.buscarPorId(baconDois.id))
      ?.itens[0].insumoId !== undefined
  ) {
    throw new Error(
      "Falha: desligar o insumo não limpou o vínculo."
    );
  }

  // --------------------------------------------------
  // NOTA EM DUPLICIDADE (regra 9.18)
  // --------------------------------------------------

  const CHAVE_DUPLICADA =
    "13261111222333000181550010000123451123456780";

  const primeiraNota =
    await service.criarEntradaCompra({
      entrada: criarEntrada(fornecedor.id, {
        numeroDocumento: "12345",
        chaveAcesso: CHAVE_DUPLICADA,
      }),
    });

  await esperarErro(
    () =>
      service.criarEntradaCompra({
        entrada: criarEntrada(fornecedor.id, {
          numeroDocumento: "12345",
          chaveAcesso: CHAVE_DUPLICADA,
        }),
      }),
    "Esta nota já foi lançada (documento 12345, entrada em rascunho). Abra a entrada existente para continuar o lançamento."
  );

  // A própria entrada pode ser alterada sem acusar duplicidade.
  await service.atualizarEntradaCompra({
    entrada: {
      ...primeiraNota,
      observacao: "Conferida",
    },
  });

  // Outra entrada não pode receber a chave de uma nota já lançada.
  const outraNota =
    await service.criarEntradaCompra({
      entrada: criarEntrada(fornecedor.id, {
        numeroDocumento: "999",
      }),
    });

  await esperarErro(
    () =>
      service.atualizarEntradaCompra({
        entrada: {
          ...outraNota,
          chaveAcesso: CHAVE_DUPLICADA,
        },
      }),
    "Esta nota já foi lançada (documento 12345, entrada em rascunho). Abra a entrada existente para continuar o lançamento."
  );

  // Nota confirmada: a mensagem pede para cancelar antes.
  await entradaRepository.atualizar({
    ...primeiraNota,
    status: "CONFIRMADA",
  });

  await esperarErro(
    () =>
      service.criarEntradaCompra({
        entrada: criarEntrada(fornecedor.id, {
          numeroDocumento: "12345",
          chaveAcesso: CHAVE_DUPLICADA,
        }),
      }),
    "Esta nota já foi lançada (documento 12345, entrada confirmada). Para lançar de novo, cancele a entrada existente."
  );

  // Depois de cancelada, a nota pode ser lançada de novo.
  await service.cancelarEntradaCompra(
    primeiraNota.id,
    "Lançada com erro."
  );

  const relancada =
    await service.criarEntradaCompra({
      entrada: criarEntrada(fornecedor.id, {
        numeroDocumento: "12345",
        chaveAcesso: CHAVE_DUPLICADA,
      }),
    });

  if (relancada.chaveAcesso !== CHAVE_DUPLICADA) {
    throw new Error(
      "Falha: nota cancelada não pôde ser lançada de novo."
    );
  }

  console.log(
    "✅ Todos os testes do EntradaCompraService passaram."
  );
}

executarTestes().catch(
  (error) => {
    console.error(
      "❌ Testes do EntradaCompraService falharam:"
    );

    console.error(error);

    process.exitCode = 1;
  }
);