import {
  FichaTecnicaRepositoryPort,
} from "../repositories/fichaTecnicaRepositoryPort";

import {
  FichaTecnica,
} from "../types/fichaTecnica";

import {
  InsumoRepositoryPort,
} from "../../insumos/repositories/insumoRepositoryPort";


function validarFicha(
  ficha: FichaTecnica
): FichaTecnica {
  if (!ficha.nome.trim()) {
    throw new Error(
      "Nome da ficha técnica é obrigatório."
    );
  }

  if (
    ficha.tipo !== "PRODUTO" &&
    ficha.tipo !== "PREPARACAO"
  ) {
    throw new Error(
      "Tipo de ficha técnica inválido."
    );
  }

  if (
    ficha.tipo === "PRODUTO" &&
    !ficha.produtoId?.trim()
  ) {
    throw new Error(
      "Fichas do tipo PRODUTO devem possuir um produto."
    );
  }

  if (
    ficha.tipo === "PREPARACAO" &&
    ficha.produtoId
  ) {
    throw new Error(
      "Fichas do tipo PREPARACAO não podem possuir produto."
    );
  }

  if (ficha.embalagem < 0) {
    throw new Error(
      "Custo de embalagem não pode ser negativo."
    );
  }

  const referencias = new Set<string>();

  for (const item of ficha.itens) {
    if (
      item.tipo !== "INSUMO" &&
      item.tipo !== "PREPARACAO"
    ) {
      throw new Error(
        `Tipo de item inválido: ${item.tipo}.`
      );
    }

    if (item.quantidade <= 0) {
      throw new Error(
        "A quantidade do item deve ser maior que zero."
      );
    }

    if (
      item.percentualPerda < 0 ||
      item.percentualPerda >= 100
    ) {
      throw new Error(
        "O percentual de perda deve estar entre 0 e 99,99."
      );
    }

    if (item.tipo === "INSUMO") {
      if (!item.insumoId) {
        throw new Error(
          "Item do tipo INSUMO exige insumoId."
        );
      }

      if (item.preparacaoId) {
        throw new Error(
          "Item do tipo INSUMO não pode possuir preparacaoId."
        );
      }

      const chave = `INSUMO:${item.insumoId}`;

      if (referencias.has(chave)) {
        throw new Error(
          `O insumo ${item.insumoId} foi adicionado mais de uma vez à ficha técnica.`
        );
      }

      referencias.add(chave);
    }

    if (item.tipo === "PREPARACAO") {
      if (!item.preparacaoId) {
        throw new Error(
          "Item do tipo PREPARACAO exige preparacaoId."
        );
      }

      if (item.insumoId) {
        throw new Error(
          "Item do tipo PREPARACAO não pode possuir insumoId."
        );
      }

      const chave = `PREPARACAO:${item.preparacaoId}`;

      if (referencias.has(chave)) {
        throw new Error(
          `A preparação ${item.preparacaoId} foi adicionada mais de uma vez à ficha técnica.`
        );
      }

      referencias.add(chave);
    }
  }

  return ficha;
}


export class FichaTecnicaService {
  constructor(
    private readonly repository:
      FichaTecnicaRepositoryPort,

    private readonly insumoRepository:
      InsumoRepositoryPort
  ) {}

  async buscarPorId(
    id: string
  ): Promise<FichaTecnica | undefined> {
    if (!id || !id.trim()) {
      throw new Error(
        "ID da ficha técnica é obrigatório."
      );
    }

    return this.repository.buscarPorId(id);
  }

  async buscarPorProdutoId(
    produtoId: string
  ): Promise<FichaTecnica | undefined> {
    if (!produtoId || !produtoId.trim()) {
      throw new Error(
        "ID do produto é obrigatório."
      );
    }

    return this.repository.buscarPorProdutoId(
      produtoId
    );
  }

  private async validarReferencias(
    ficha: FichaTecnica
  ): Promise<void> {
    for (const item of ficha.itens) {
      if (item.tipo === "INSUMO") {
        const insumo =
          await this.insumoRepository.buscarPorId(
            item.insumoId!
          );

        if (!insumo) {
          throw new Error(
            `Insumo ${item.insumoId} não encontrado.`
          );
        }

        if (!insumo.ativo) {
          throw new Error(
            `O insumo "${insumo.nome}" está inativo e não pode ser utilizado na ficha técnica.`
          );
        }
      }

      if (item.tipo === "PREPARACAO") {
        const preparacao =
          await this.repository.buscarPorId(
            item.preparacaoId!
          );

        if (!preparacao) {
          throw new Error(
            `Preparação ${item.preparacaoId} não encontrada.`
          );
        }

        if (!preparacao.ativo) {
          throw new Error(
            `A preparação "${preparacao.nome}" está inativa e não pode ser utilizada na ficha técnica.`
          );
        }

        if (preparacao.id === ficha.id) {
          throw new Error(
            "Uma ficha técnica não pode utilizar a si mesma como preparação."
          );
        }
      }
    }
  }

  private async validarCiclos(
  ficha: FichaTecnica,
  caminho: string[] = []
): Promise<void> {
  if (caminho.includes(ficha.id)) {
    throw new Error(
      `Ciclo de preparações detectado na ficha "${ficha.nome}".`
    );
  }

  const novoCaminho = [
    ...caminho,
    ficha.id,
  ];

  for (const item of ficha.itens) {
    if (
      item.tipo !== "PREPARACAO" ||
      !item.preparacaoId
    ) {
      continue;
    }

    const preparacao =
      await this.repository.buscarPorId(
        item.preparacaoId
      );

    if (!preparacao) {
      throw new Error(
        `Preparação ${item.preparacaoId} não encontrada.`
      );
    }

    await this.validarCiclos(
      preparacao,
      novoCaminho
    );
  }
}

  async criar(
  ficha: FichaTecnica
): Promise<FichaTecnica> {
  const fichaValidada =
    validarFicha(ficha);

  await this.validarReferencias(
    fichaValidada
  );

  await this.validarCiclos(
    fichaValidada
  );

  return this.repository.criar(
    fichaValidada
  );
}

  async atualizar(
    ficha: FichaTecnica
  ): Promise<FichaTecnica> {
    let existente: FichaTecnica | undefined;

    if (ficha.tipo === "PRODUTO") {
      if (!ficha.produtoId) {
        throw new Error(
          "Ficha técnica do tipo PRODUTO exige produtoId."
        );
      }

      existente =
        await this.repository.buscarPorProdutoId(
          ficha.produtoId
        );
    } else {
      if (!ficha.id) {
        throw new Error(
          "Ficha técnica do tipo PREPARACAO exige id."
        );
      }

      existente =
        await this.repository.buscarPorId(
          ficha.id
        );
    }

    if (!existente) {
      throw new Error(
        "Ficha técnica não encontrada."
      );
    }

    const fichaValidada =
      validarFicha({
        ...ficha,
        id: existente.id,
        criadoEm: existente.criadoEm,
      });

    await this.validarReferencias(
      fichaValidada
    );

    await this.validarCiclos(
  fichaValidada
);

    return this.repository.atualizar(
      fichaValidada
    );
  }
}