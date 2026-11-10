import {
  converterSeCompativel,
} from "@/modules/fichasTecnicas/services/conversaoUnidade";

// Bloco 8C (regra 7.12): o custo do insumo é o último preço pago por
// unidade de compra do insumo. Funções puras, sem acesso a banco.

export interface ItemParaCusto {
  quantidade: number;
  unidade: string;
  // Valor pago pelo item, já com o desconto do item. Frete e impostos
  // da nota ficam fora.
  valorTotal: number;
}

export interface InsumoParaCusto {
  unidadeCompra: string;

  // 1 unidade de compra = N unidades de uso (bloco 8B).
  equivalenciaQuantidade?: number;
  equivalenciaUnidade?: string;
}

export type ResultadoCustoDaCompra =
  | {
      ok: true;
      // Quanto a compra vale na unidade de compra do insumo.
      quantidadeConvertida: number;
      unidadeConvertida: string;
      // Preço pago por 1 unidade de compra do insumo.
      precoPorUnidade: number;
    }
  | {
      ok: false;
      motivo: string;
    };

function arredondar4(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}

export function calcularCustoDaCompra(
  item: ItemParaCusto,
  insumo: InsumoParaCusto
): ResultadoCustoDaCompra {
  if (!(item.quantidade > 0)) {
    return {
      ok: false,
      motivo: "Quantidade do item deve ser maior que zero.",
    };
  }

  // Item de valor zero (bonificação) não define preço.
  if (!(item.valorTotal > 0)) {
    return {
      ok: false,
      motivo: "Item sem valor pago não define custo.",
    };
  }

  let quantidadeConvertida = converterSeCompativel(
    item.quantidade,
    item.unidade,
    insumo.unidadeCompra
  );

  if (
    quantidadeConvertida === undefined &&
    insumo.equivalenciaQuantidade !== undefined &&
    insumo.equivalenciaQuantidade > 0 &&
    insumo.equivalenciaUnidade?.trim()
  ) {
    const naEquivalencia = converterSeCompativel(
      item.quantidade,
      item.unidade,
      insumo.equivalenciaUnidade
    );

    if (naEquivalencia !== undefined) {
      quantidadeConvertida =
        naEquivalencia / insumo.equivalenciaQuantidade;
    }
  }

  if (
    quantidadeConvertida === undefined ||
    !(quantidadeConvertida > 0)
  ) {
    return {
      ok: false,
      motivo: `A unidade do item (${item.unidade}) não converte para a unidade do insumo (${insumo.unidadeCompra}). Cadastre a equivalência no insumo.`,
    };
  }

  return {
    ok: true,
    quantidadeConvertida:
      Math.round(quantidadeConvertida * 10000) / 10000,
    unidadeConvertida: insumo.unidadeCompra,
    precoPorUnidade: arredondar4(
      item.valorTotal / quantidadeConvertida
    ),
  };
}

// Mantém a quantidade de compra do insumo e ajusta o preço dela, para o
// custo por unidade ser o preço da última compra.
export function aplicarPrecoNoInsumo(
  quantidadeCompra: number,
  precoPorUnidade: number
): { precoCompra: number; custoUnitario: number } {
  return {
    precoCompra: arredondar4(
      precoPorUnidade * quantidadeCompra
    ),
    custoUnitario: precoPorUnidade,
  };
}

export interface RegistroHistoricoPreco {
  dataCompra: string;
  criadoEm: string;
  precoPorUnidade: number;
  custoAnterior: number;
}

// A última compra é a de data mais recente (empate: a gravada por último).
export function ordenarHistorico<
  T extends RegistroHistoricoPreco
>(registros: T[]): T[] {
  return [...registros].sort((a, b) => {
    const porData =
      new Date(a.dataCompra).getTime() -
      new Date(b.dataCompra).getTime();

    return porData !== 0
      ? porData
      : new Date(a.criadoEm).getTime() -
          new Date(b.criadoEm).getTime();
  });
}
