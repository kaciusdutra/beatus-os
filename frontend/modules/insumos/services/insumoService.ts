import {
  InsumoRepositoryPort,
} from "../repositories/insumoRepositoryPort";

import {
  Insumo,
} from "../types/insumo";

function validarInsumo(
  insumo: Insumo
): Insumo {
  if (!insumo.nome.trim()) {
    throw new Error(
      "Nome do insumo é obrigatório."
    );
  }

  if (!insumo.categoriaId.trim()) {
    throw new Error(
      "Categoria do insumo é obrigatória."
    );
  }

  if (
    !insumo.unidadeCompraId.trim()
  ) {
    throw new Error(
      "Unidade de compra é obrigatória."
    );
  }

  if (
    insumo.quantidadeCompra <= 0
  ) {
    throw new Error(
      "Quantidade de compra deve ser maior que zero."
    );
  }

  if (
    insumo.precoCompra < 0
  ) {
    throw new Error(
      "Preço de compra não pode ser negativo."
    );
  }

  if (
    !Number.isFinite(insumo.perdaLimpeza) ||
    insumo.perdaLimpeza < 0 ||
    insumo.perdaLimpeza >= 100
  ) {
    throw new Error(
      "Perda de limpeza deve estar entre 0 e 99,99."
    );
  }

  // A equivalência é "1 unidade de compra = N unidade de uso": os dois
  // campos andam juntos.
  const equivalenciaUnidade =
    insumo.equivalenciaUnidade?.trim() ||
    undefined;

  if (
    (insumo.equivalenciaQuantidade !== undefined) !==
    (equivalenciaUnidade !== undefined)
  ) {
    throw new Error(
      "Informe a quantidade e a unidade da equivalência, ou deixe as duas em branco."
    );
  }

  if (
    insumo.equivalenciaQuantidade !== undefined &&
    (!Number.isFinite(insumo.equivalenciaQuantidade) ||
      insumo.equivalenciaQuantidade <= 0)
  ) {
    throw new Error(
      "A equivalência do insumo deve ser maior que zero."
    );
  }

  const custoUnitario =
    insumo.precoCompra /
    insumo.quantidadeCompra;

  return {
    ...insumo,

    nome:
      insumo.nome.trim(),

    categoriaId:
      insumo.categoriaId.trim(),

    unidadeCompraId:
      insumo.unidadeCompraId.trim(),

    fornecedorId:
      insumo.fornecedorId?.trim() ||
      undefined,

    observacao:
      insumo.observacao?.trim() ||
      undefined,

    equivalenciaUnidade,

    custoUnitario,
  };
}

export class InsumoService {
  constructor(
    private readonly repository: InsumoRepositoryPort
  ) {}

  async buscarPorId(
    id: string
  ): Promise<
    Insumo | undefined
  > {
    return this.repository.buscarPorId(
      id
    );
  }

  async listar(): Promise<
    Insumo[]
  > {
    return this.repository.listar();
  }

  async criar(
    insumo: Insumo
  ): Promise<Insumo> {
    const insumoValidado =
      validarInsumo(
        insumo
      );

    return this.repository.criar(
      insumoValidado
    );
  }

  async atualizar(
    insumo: Insumo
  ): Promise<Insumo> {
    const existente =
      await this.repository.buscarPorId(
        insumo.id
      );

    if (!existente) {
      throw new Error(
        "Insumo não encontrado."
      );
    }

    const insumoValidado =
      validarInsumo(
        insumo
      );

    return this.repository.atualizar(
      {
        ...insumoValidado,

        id:
          existente.id,

        criadoEm:
          existente.criadoEm,
      }
    );
  }
}