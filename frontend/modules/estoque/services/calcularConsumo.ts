import {
  calcularAproveitamento,
  quantidadeNaUnidadeDeCompra,
} from "@/modules/fichasTecnicas/services/calcularCustoItem";

import {
  converterSeCompativel,
} from "@/modules/fichasTecnicas/services/conversaoUnidade";

import type {
  ContextoCustoFicha,
} from "@/modules/fichasTecnicas/services/calcularCustoFichaTecnica";

import type {
  FichaTecnica,
} from "@/modules/fichasTecnicas/types/fichaTecnica";

// O que uma ficha consome do estoque. Funções puras, sem banco.
// Insumo: na unidade de compra do insumo. Preparação: na unidade de
// rendimento da ficha. A perda (limpeza e cocção) aumenta o que sai do
// estoque, como no custo: sai quantidade ÷ aproveitamento.

export interface ConsumoDeEstoque {
  itemTipo: "INSUMO" | "PREPARACAO";

  id: string;

  nome: string;

  quantidade: number;

  unidade: string;
}

export interface ResultadoDoConsumo {
  consumos: ConsumoDeEstoque[];

  // O que não pôde ser calculado ou não entra na baixa automática.
  avisos: string[];
}

function arredondar(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}

export function consumoDaFicha(
  ficha: FichaTecnica,
  multiplicador: number,
  contexto: ContextoCustoFicha,
  caminho: string[] = []
): ResultadoDoConsumo {
  const consumos = new Map<string, ConsumoDeEstoque>();
  const avisos: string[] = [];

  function somar(consumo: ConsumoDeEstoque): void {
    const chave = `${consumo.itemTipo}:${consumo.id}`;

    const atual = consumos.get(chave);

    if (atual) {
      atual.quantidade = arredondar(
        atual.quantidade + consumo.quantidade
      );
    } else {
      consumos.set(chave, {
        ...consumo,
        quantidade: arredondar(consumo.quantidade),
      });
    }
  }

  const novoCaminho = [...caminho, ficha.id];

  for (const item of ficha.itens) {
    // O cliente escolhe uma das opções do grupo; o pedido ainda não guarda
    // qual foi, então estes itens não baixam sozinhos.
    if (item.grupoEscolha?.trim()) {
      avisos.push(
        `Item com opção de escolha (${item.grupoEscolha}) não foi baixado automaticamente.`
      );

      continue;
    }

    const quantidadeBruta = item.quantidade * multiplicador;

    if (item.tipo === "INSUMO") {
      const insumo = item.insumoId
        ? contexto.buscarInsumo(item.insumoId)
        : undefined;

      if (!insumo) {
        avisos.push("Insumo da ficha não encontrado ou inativo.");

        continue;
      }

      try {
        const naUnidade = quantidadeNaUnidadeDeCompra({
          quantidadeCompra: 1,
          precoCompra: 0,
          unidadeCompra: insumo.unidadeCompra,
          equivalenciaQuantidade: insumo.equivalenciaQuantidade,
          equivalenciaUnidade: insumo.equivalenciaUnidade,
          quantidadeFicha: quantidadeBruta,
          unidadeFicha: item.unidade,
          perdaLimpeza: insumo.perdaLimpeza,
          percentualPerda: item.percentualPerda,
        });

        const aproveitamento = calcularAproveitamento(
          insumo.perdaLimpeza,
          item.percentualPerda
        );

        somar({
          itemTipo: "INSUMO",
          id: insumo.id,
          nome: insumo.nome,
          quantidade: naUnidade / aproveitamento,
          unidade: insumo.unidadeCompra,
        });
      } catch (erro) {
        avisos.push(
          `${insumo.nome}: ${erro instanceof Error ? erro.message : "não foi possível converter a unidade."}`
        );
      }

      continue;
    }

    const usada = item.preparacaoId
      ? contexto.buscarFicha(item.preparacaoId)
      : undefined;

    if (!usada) {
      avisos.push("Ficha usada como item não encontrada.");

      continue;
    }

    if (novoCaminho.includes(usada.id)) {
      avisos.push(`Ciclo entre fichas em "${usada.nome}".`);

      continue;
    }

    // Produto dentro de produto (combo): consome o que o outro produto consome.
    if (usada.tipo === "PRODUTO") {
      const interno = consumoDaFicha(
        usada,
        quantidadeBruta,
        contexto,
        novoCaminho
      );

      for (const consumo of interno.consumos) {
        somar(consumo);
      }

      avisos.push(...interno.avisos);

      continue;
    }

    // Preparação: sai do estoque da própria preparação.
    const unidadeRendimento = (usada.unidadeRendimento ?? "").trim();

    const naUnidade = converterSeCompativel(
      quantidadeBruta,
      item.unidade,
      unidadeRendimento
    );

    if (!unidadeRendimento || naUnidade === undefined) {
      avisos.push(
        `${usada.nome}: não foi possível converter ${item.unidade} para ${unidadeRendimento || "a unidade de rendimento"}.`
      );

      continue;
    }

    somar({
      itemTipo: "PREPARACAO",
      id: usada.id,
      nome: usada.nome,
      quantidade:
        naUnidade / calcularAproveitamento(0, item.percentualPerda),
      unidade: unidadeRendimento,
    });
  }

  return { consumos: [...consumos.values()], avisos };
}
