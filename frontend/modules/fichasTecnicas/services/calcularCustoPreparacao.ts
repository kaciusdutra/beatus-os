import {
  FichaTecnica,
  FichaTecnicaItem,
} from "../types/fichaTecnica";

export interface ResultadoCustoPreparacao {
  custoTotal: number;
  rendimento: number;
  unidadeRendimento: string;
  custoPorUnidade: number;
}

export interface ContextoCustoPreparacao {
  calcularItem(
    item: FichaTecnicaItem
  ): number;

  buscarPreparacao(
    preparacaoId: string
  ): FichaTecnica | undefined;
}

export function calcularCustoPreparacao(
  ficha: FichaTecnica,
  contexto: ContextoCustoPreparacao,
  caminho: string[] = []
): ResultadoCustoPreparacao {
  if (caminho.includes(ficha.id)) {
    throw new Error(
      `Ciclo detectado entre fichas técnicas: ${[
        ...caminho,
        ficha.id,
      ].join(" -> ")}`
    );
  }

  const novoCaminho = [
    ...caminho,
    ficha.id,
  ];

  if (
    ficha.rendimento === undefined ||
    ficha.rendimento <= 0
  ) {
    throw new Error(
      `A preparação "${ficha.nome}" precisa possuir um rendimento maior que zero.`
    );
  }

  if (
    !ficha.unidadeRendimento?.trim()
  ) {
    throw new Error(
      `A preparação "${ficha.nome}" precisa possuir uma unidade de rendimento.`
    );
  }

  let custoTotal = 0;

  for (const item of ficha.itens) {
    if (item.tipo === "INSUMO") {
      if (!item.insumoId) {
        throw new Error(
          `O item "${item.id}" está marcado como INSUMO, mas não possui insumoId.`
        );
      }

      custoTotal +=
        contexto.calcularItem(item);

      continue;
    }

    if (item.tipo === "PREPARACAO") {
      if (!item.preparacaoId) {
        throw new Error(
          `O item "${item.id}" está marcado como PREPARACAO, mas não possui preparacaoId.`
        );
      }

      const preparacao =
        contexto.buscarPreparacao(
          item.preparacaoId
        );

      if (!preparacao) {
        throw new Error(
          `Preparação "${item.preparacaoId}" não encontrada.`
        );
      }

      const resultado =
        calcularCustoPreparacao(
          preparacao,
          contexto,
          novoCaminho
        );

      custoTotal +=
        item.quantidade *
        resultado.custoPorUnidade;

      continue;
    }

    throw new Error(
      `Tipo de item inválido: ${item.tipo}`
    );
  }

  return {
    custoTotal,
    rendimento: ficha.rendimento,
    unidadeRendimento:
      ficha.unidadeRendimento,
    custoPorUnidade:
      custoTotal / ficha.rendimento,
  };
}