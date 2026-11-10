// Motor de custo das fichas técnicas (bloco 8D).
//
// Calcula o custo de uma ficha de PREPARAÇÃO ou de PRODUTO, inclusive quando
// ela usa outras fichas (blend dentro do Agnus, Agnus dentro de um combo).
// Não lança erro por causa de um item com problema: devolve o custo do que
// foi possível calcular e a mensagem do que falta, para a tela mostrar.
//
// Sem dependências de servidor: roda na tela (custo ao vivo) e no servidor.

import {
  calcularAproveitamento,
  calcularCustoItem,
} from "./calcularCustoItem";

import {
  converterSeCompativel,
} from "./conversaoUnidade";

import {
  FichaTecnica,
} from "../types/fichaTecnica";

export interface DadosInsumoCusto {
  id: string;
  nome: string;

  quantidadeCompra: number;
  precoCompra: number;
  // Abreviação da unidade de compra (kg, g, L, un...).
  unidadeCompra: string;

  equivalenciaQuantidade?: number;
  equivalenciaUnidade?: string;
  perdaLimpeza: number;

  // true para insumos da categoria Embalagens: vão para o bloco de embalagem.
  embalagem: boolean;
}

export interface ContextoCustoFicha {
  buscarInsumo(
    id: string
  ): DadosInsumoCusto | undefined;

  buscarFicha(
    id: string
  ): FichaTecnica | undefined;
}

export interface CustoItemFicha {
  itemId: string;

  // null quando o item tem pendência (ver erro).
  custo: number | null;

  erro?: string;

  // Item que é insumo de embalagem.
  embalagem: boolean;

  // Para item que é outra ficha: custo por unidade dela (ex.: R$ 0,031 por g).
  custoPorUnidade?: number;
  unidadeReferencia?: string;
}

export interface ResultadoCustoFichaTecnica {
  itens: CustoItemFicha[];

  // Itens que não são embalagem.
  custoReceita: number;

  // Insumos da categoria Embalagens usados como item.
  custoEmbalagemItens: number;

  // Campo "embalagem" fixo da ficha (opcional).
  custoEmbalagemFixa: number;

  custoTotal: number;

  // Só em preparação: rendimento e custo por unidade (ex.: R$ por g).
  rendimento?: number;
  unidadeRendimento?: string;
  custoPorUnidade?: number;

  // false quando algum item ficou sem custo.
  completo: boolean;

  // Pendências da ficha (e das fichas que ela usa).
  erros: string[];
}

function arredondar(valor: number): number {
  return Math.round(valor * 1_000_000) / 1_000_000;
}

export function calcularCustoFichaTecnica(
  ficha: FichaTecnica,
  contexto: ContextoCustoFicha,
  caminho: string[] = [],
  cache: Map<
    string,
    ResultadoCustoFichaTecnica
  > = new Map()
): ResultadoCustoFichaTecnica {
  const jaCalculada = cache.get(ficha.id);

  if (jaCalculada && caminho.length > 0) {
    return jaCalculada;
  }

  const novoCaminho = [...caminho, ficha.id];

  const itens: CustoItemFicha[] = [];
  const erros: string[] = [];

  let custoReceita = 0;
  let custoEmbalagemItens = 0;

  for (const item of ficha.itens) {
    const base: CustoItemFicha = {
      itemId: item.id,
      custo: null,
      embalagem: false,
    };

    try {
      if (item.tipo === "INSUMO") {
        const insumo = item.insumoId
          ? contexto.buscarInsumo(item.insumoId)
          : undefined;

        if (!insumo) {
          throw new Error(
            "Insumo não encontrado ou inativo."
          );
        }

        base.embalagem = insumo.embalagem;

        const custo = calcularCustoItem({
          quantidadeCompra: insumo.quantidadeCompra,
          precoCompra: insumo.precoCompra,
          unidadeCompra: insumo.unidadeCompra,
          equivalenciaQuantidade:
            insumo.equivalenciaQuantidade,
          equivalenciaUnidade:
            insumo.equivalenciaUnidade,
          perdaLimpeza: insumo.perdaLimpeza,
          quantidadeFicha: item.quantidade,
          unidadeFicha: item.unidade,
          percentualPerda: item.percentualPerda,
        });

        base.custo = custo;

        if (insumo.embalagem) {
          custoEmbalagemItens += custo;
        } else {
          custoReceita += custo;
        }

        itens.push(base);
        continue;
      }

      // Item que é outra ficha (preparação ou produto).
      const usada = item.preparacaoId
        ? contexto.buscarFicha(item.preparacaoId)
        : undefined;

      if (!usada) {
        throw new Error("Ficha não encontrada.");
      }

      if (novoCaminho.includes(usada.id)) {
        throw new Error(
          `Ciclo entre fichas: "${usada.nome}" já está na cadeia.`
        );
      }

      const resultadoUsada =
        calcularCustoFichaTecnica(
          usada,
          contexto,
          novoCaminho,
          cache
        );

      // Produto usado como item (combo) vale 1 un; preparação, o rendimento.
      const unidadeUsada =
        usada.tipo === "PRODUTO"
          ? "un"
          : (usada.unidadeRendimento ?? "").trim();

      const rendimentoUsado =
        usada.tipo === "PRODUTO"
          ? 1
          : (usada.rendimento ?? 0);

      if (rendimentoUsado <= 0 || !unidadeUsada) {
        throw new Error(
          `A preparação "${usada.nome}" precisa de rendimento e unidade de rendimento.`
        );
      }

      if (!resultadoUsada.completo) {
        throw new Error(
          `A ficha "${usada.nome}" tem pendências: ${resultadoUsada.erros[0] ?? "confira os itens"}.`
        );
      }

      const quantidadeNaUnidade =
        converterSeCompativel(
          item.quantidade,
          item.unidade,
          unidadeUsada
        );

      if (quantidadeNaUnidade === undefined) {
        throw new Error(
          `Não é possível converter ${item.unidade} para ${unidadeUsada} ("${usada.nome}" rende em ${unidadeUsada}).`
        );
      }

      const custoPorUnidade =
        resultadoUsada.custoTotal /
        rendimentoUsado;

      const aproveitamento =
        calcularAproveitamento(
          0,
          item.percentualPerda
        );

      base.custo =
        (quantidadeNaUnidade * custoPorUnidade) /
        aproveitamento;

      base.custoPorUnidade = custoPorUnidade;
      base.unidadeReferencia = unidadeUsada;

      custoReceita += base.custo;
      itens.push(base);
    } catch (erro) {
      const mensagem =
        erro instanceof Error
          ? erro.message
          : "Não foi possível calcular o item.";

      base.erro = mensagem;
      itens.push(base);
      erros.push(mensagem);
    }
  }

  const custoEmbalagemFixa = ficha.embalagem ?? 0;

  const custoTotal =
    custoReceita +
    custoEmbalagemItens +
    custoEmbalagemFixa;

  const resultado: ResultadoCustoFichaTecnica = {
    itens,
    custoReceita: arredondar(custoReceita),
    custoEmbalagemItens: arredondar(
      custoEmbalagemItens
    ),
    custoEmbalagemFixa: arredondar(
      custoEmbalagemFixa
    ),
    custoTotal: arredondar(custoTotal),
    completo: erros.length === 0,
    erros,
  };

  if (ficha.tipo === "PREPARACAO") {
    resultado.rendimento = ficha.rendimento;
    resultado.unidadeRendimento =
      ficha.unidadeRendimento;

    if (
      ficha.rendimento !== undefined &&
      ficha.rendimento > 0
    ) {
      resultado.custoPorUnidade = arredondar(
        custoTotal / ficha.rendimento
      );
    } else {
      resultado.completo = false;
      resultado.erros.push(
        "Informe o rendimento da preparação."
      );
    }
  }

  cache.set(ficha.id, resultado);

  return resultado;
}
