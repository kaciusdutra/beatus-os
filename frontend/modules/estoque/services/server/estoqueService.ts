import "server-only";

import { prisma } from "@/lib/prisma";

import { Prisma } from "@/lib/generated/prisma/client";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { criarInsumoRepositoryPostgres } from "@/modules/insumos/repositories/postgres/insumoRepositoryPostgres";

import { criarFichaTecnicaRepositoryPostgres } from "@/modules/fichasTecnicas/repositories/postgres/fichaTecnicaRepositoryPostgres";

import {
  calcularCustoFichaTecnica,
  type ContextoCustoFicha,
} from "@/modules/fichasTecnicas/services/calcularCustoFichaTecnica";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import { consumoDaFicha } from "../calcularConsumo";

import {
  diasDaRegra,
  validadeDoCongelado,
} from "../calcularValidade";

import { getKanbanService } from "./kanbanService";

import type {
  ItemDeEstoque,
  LoteDeProducao,
  MovimentoListado,
  PrevisaoDeProducao,
  SaldoDeEstoque,
  TipoDeMovimento,
} from "../../types/estoque";

function arredondar(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}

type Transacao = Prisma.TransactionClient;

export interface EntradaDaCompra {
  entradaCompraItemId: string;

  insumoId: string;

  quantidade: number;

  unidade: string;

  custoUnitario: number;

  documento?: string;

  operador?: string | null;
}

export class EstoqueService {
  private readonly contexto = criarContextoDesenvolvimento();

  private get empresaId(): string {
    return this.contexto.empresaId;
  }

  // Insumos e fichas atuais, no formato que o cálculo de custo e de consumo usam.
  async carregarContexto(): Promise<{
    contexto: ContextoCustoFicha;
    fichas: Awaited<
      ReturnType<
        ReturnType<typeof criarFichaTecnicaRepositoryPostgres>["listar"]
      >
    >;
  }> {
    const [insumos, fichas] = await Promise.all([
      criarInsumoRepositoryPostgres(this.contexto).listar(),
      criarFichaTecnicaRepositoryPostgres(this.contexto).listar(),
    ]);

    const porId = new Map(
      insumos.map((insumo) => [
        insumo.id,
        {
          id: insumo.id,
          nome: insumo.nome,
          quantidadeCompra: insumo.quantidadeCompra,
          precoCompra: insumo.precoCompra,
          unidadeCompra: insumo.unidadeCompraAbreviacao ?? "",
          equivalenciaQuantidade: insumo.equivalenciaQuantidade,
          equivalenciaUnidade: insumo.equivalenciaUnidade,
          perdaLimpeza: insumo.perdaLimpeza,
          embalagem: false,
        },
      ])
    );

    return {
      contexto: {
        buscarInsumo: (id) => porId.get(id),
        buscarFicha: (id) => fichas.find((ficha) => ficha.id === id),
      },
      fichas,
    };
  }

  // ---------- saldos ----------

  private async somaDosMovimentos(
    db: Pick<Transacao, "movimentoEstoque">
  ): Promise<Map<string, number>> {
    const linhas = await db.movimentoEstoque.groupBy({
      by: ["itemTipo", "insumoId", "fichaTecnicaId"],
      where: { empresaId: this.empresaId },
      _sum: { quantidade: true },
    });

    return new Map(
      linhas.map((linha) => [
        `${linha.itemTipo}:${linha.insumoId ?? linha.fichaTecnicaId}`,
        arredondar(Number(linha._sum.quantidade ?? 0)),
      ])
    );
  }

  async listarSaldos(): Promise<SaldoDeEstoque[]> {
    const [somas, insumos, preparacoes, ultimosLotes] = await Promise.all([
      this.somaDosMovimentos(prisma),

      prisma.insumo.findMany({
        where: { empresaId: this.empresaId, ativo: true },
        include: { unidadeMedida: true, categoriaInsumo: true },
        orderBy: { nome: "asc" },
      }),

      prisma.fichaTecnica.findMany({
        where: {
          empresaId: this.empresaId,
          tipo: "PREPARACAO",
          ativo: true,
        },
        orderBy: { nome: "asc" },
      }),

      prisma.producaoLote.findMany({
        where: { empresaId: this.empresaId },
        orderBy: { criadoEm: "desc" },
      }),
    ]);

    const saldos: SaldoDeEstoque[] = [];

    for (const insumo of insumos) {
      const saldo = somas.get(`INSUMO:${insumo.id}`) ?? 0;

      const minimo =
        insumo.estoqueMinimo !== null
          ? Number(insumo.estoqueMinimo)
          : undefined;

      const custoUnitario = Number(insumo.custoUnitario);

      saldos.push({
        itemTipo: "INSUMO",
        id: insumo.id,
        nome: insumo.nome,
        categoria: insumo.categoriaInsumo?.nome,
        unidade: insumo.unidadeMedida?.abreviacao ?? "",
        saldo,
        minimo,
        custoUnitario,
        valor: arredondar(Math.max(saldo, 0) * custoUnitario),
        abaixoDoMinimo: minimo !== undefined && saldo < minimo,
      });
    }

    for (const ficha of preparacoes) {
      const saldo = somas.get(`PREPARACAO:${ficha.id}`) ?? 0;

      const minimo =
        ficha.estoqueMinimo !== null
          ? Number(ficha.estoqueMinimo)
          : undefined;

      const ultimoLote = ultimosLotes.find(
        (lote) =>
          lote.fichaTecnicaId === ficha.id && lote.custoUnitario !== null
      );

      const custoUnitario = ultimoLote
        ? Number(ultimoLote.custoUnitario)
        : undefined;

      saldos.push({
        itemTipo: "PREPARACAO",
        id: ficha.id,
        nome: ficha.nome,
        categoria: "Preparação",
        unidade: ficha.unidadeRendimento ?? "",
        saldo,
        minimo,
        custoUnitario,
        valor:
          custoUnitario !== undefined
            ? arredondar(Math.max(saldo, 0) * custoUnitario)
            : undefined,
        abaixoDoMinimo: minimo !== undefined && saldo < minimo,
      });
    }

    return saldos;
  }

  async historico(
    itemTipo: ItemDeEstoque,
    id: string,
    limite = 50
  ): Promise<MovimentoListado[]> {
    const linhas = await prisma.movimentoEstoque.findMany({
      where: {
        empresaId: this.empresaId,
        itemTipo,
        ...(itemTipo === "INSUMO" ? { insumoId: id } : { fichaTecnicaId: id }),
      },
      orderBy: { criadoEm: "desc" },
      take: Math.min(Math.max(limite, 1), 200),
    });

    return linhas.map((linha) => ({
      id: linha.id,
      tipo: linha.tipo as TipoDeMovimento,
      quantidade: Number(linha.quantidade),
      unidade: linha.unidade,
      motivo: linha.motivo ?? undefined,
      criadoEm: linha.criadoEm.toISOString(),
    }));
  }

  // ---------- compras ----------

  // A compra confirmada entra no estoque, na quantidade convertida para a
  // unidade de compra do insumo. O mesmo item nunca entra duas vezes.
  async registrarEntradaDaCompra(entrada: EntradaDaCompra): Promise<boolean> {
    try {
      await prisma.movimentoEstoque.create({
        data: {
          empresaId: this.empresaId,
          itemTipo: "INSUMO",
          insumoId: entrada.insumoId,
          tipo: "ENTRADA_COMPRA",
          quantidade: entrada.quantidade,
          unidade: entrada.unidade,
          custoUnitario: entrada.custoUnitario,
          motivo: entrada.documento
            ? `Compra ${entrada.documento}`
            : undefined,
          entradaCompraItemId: entrada.entradaCompraItemId,
        },
      });

      return true;
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === "P2002"
      ) {
        return false;
      }

      throw erro;
    }
  }

  // Compra cancelada: o que entrou sai de volta (uma vez só por item).
  async estornarEntradasDaCompra(
    entradaCompraItemIds: string[],
    operador?: string | null
  ): Promise<number> {
    if (entradaCompraItemIds.length === 0) {
      return 0;
    }

    const entradas = await prisma.movimentoEstoque.findMany({
      where: {
        empresaId: this.empresaId,
        tipo: "ENTRADA_COMPRA",
        entradaCompraItemId: { in: entradaCompraItemIds },
      },
    });

    let estornados = 0;

    for (const entrada of entradas) {
      try {
        await prisma.movimentoEstoque.create({
          data: {
            empresaId: this.empresaId,
            itemTipo: entrada.itemTipo,
            insumoId: entrada.insumoId,
            tipo: "ESTORNO_COMPRA",
            quantidade: Number(entrada.quantidade) * -1,
            unidade: entrada.unidade,
            custoUnitario: entrada.custoUnitario,
            motivo: "Entrada de compra cancelada",
            entradaCompraItemId: entrada.entradaCompraItemId,
          },
        });

        estornados++;
      } catch (erro) {
        if (
          !(
            erro instanceof Prisma.PrismaClientKnownRequestError &&
            erro.code === "P2002"
          )
        ) {
          throw erro;
        }
      }
    }

    if (estornados > 0) {
      await registrarAtividade(prisma, {
        entidade: "ESTOQUE",
        acao: "ESTORNO_COMPRA",
        resumo: `Compra cancelada: ${estornados} item(ns) saíram do estoque.`,
        operador,
      });
    }

    return estornados;
  }

  // ---------- contagem, perda e mínimo ----------

  private async dadosDoItem(
    itemTipo: ItemDeEstoque,
    id: string
  ): Promise<{ nome: string; unidade: string }> {
    if (itemTipo === "INSUMO") {
      const insumo = await prisma.insumo.findFirst({
        where: { id, empresaId: this.empresaId },
        include: { unidadeMedida: true },
      });

      if (!insumo) {
        throw new Error("Insumo não encontrado.");
      }

      return {
        nome: insumo.nome,
        unidade: insumo.unidadeMedida?.abreviacao ?? "",
      };
    }

    const ficha = await prisma.fichaTecnica.findFirst({
      where: { id, empresaId: this.empresaId, tipo: "PREPARACAO" },
    });

    if (!ficha) {
      throw new Error("Preparação não encontrada.");
    }

    return { nome: ficha.nome, unidade: ficha.unidadeRendimento ?? "" };
  }

  private chaveDoItem(itemTipo: ItemDeEstoque, id: string) {
    return itemTipo === "INSUMO"
      ? { insumoId: id }
      : { fichaTecnicaId: id };
  }

  // Inventário: você informa o que contou; o sistema ajusta a diferença.
  async ajustarPorContagem(
    itemTipo: ItemDeEstoque,
    id: string,
    contado: number,
    motivo: string,
    operador?: string | null
  ): Promise<{ saldoAnterior: number; ajuste: number }> {
    if (!Number.isFinite(contado) || contado < 0) {
      throw new Error("A quantidade contada deve ser zero ou maior.");
    }

    if (!motivo.trim()) {
      throw new Error("Informe o motivo do ajuste.");
    }

    const item = await this.dadosDoItem(itemTipo, id);

    return prisma.$transaction(async (tx) => {
      const somas = await this.somaDosMovimentos(tx);

      const saldoAnterior = somas.get(`${itemTipo}:${id}`) ?? 0;

      const ajuste = arredondar(contado - saldoAnterior);

      if (Math.abs(ajuste) > 0.00005) {
        await tx.movimentoEstoque.create({
          data: {
            empresaId: this.empresaId,
            itemTipo,
            ...this.chaveDoItem(itemTipo, id),
            tipo: "AJUSTE_CONTAGEM",
            quantidade: ajuste,
            unidade: item.unidade,
            motivo: motivo.trim(),
          },
        });
      }

      await registrarAtividade(tx, {
        entidade: "ESTOQUE",
        acao: "CONTAGEM",
        resumo: `Contagem de ${item.nome}: ${contado} ${item.unidade} (saldo era ${saldoAnterior}; ajuste de ${ajuste}). Motivo: ${motivo.trim()}`,
        referenciaId: id,
        operador,
      });

      return { saldoAnterior, ajuste };
    });
  }

  async registrarPerda(
    itemTipo: ItemDeEstoque,
    id: string,
    quantidade: number,
    motivo: string,
    operador?: string | null
  ): Promise<void> {
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      throw new Error("A quantidade da perda deve ser maior que zero.");
    }

    if (!motivo.trim()) {
      throw new Error("Informe o motivo da perda.");
    }

    const item = await this.dadosDoItem(itemTipo, id);

    await prisma.$transaction(async (tx) => {
      await tx.movimentoEstoque.create({
        data: {
          empresaId: this.empresaId,
          itemTipo,
          ...this.chaveDoItem(itemTipo, id),
          tipo: "PERDA",
          quantidade: arredondar(quantidade) * -1,
          unidade: item.unidade,
          motivo: motivo.trim(),
        },
      });

      await registrarAtividade(tx, {
        entidade: "ESTOQUE",
        acao: "PERDA",
        resumo: `Perda de ${quantidade} ${item.unidade} de ${item.nome}. Motivo: ${motivo.trim()}`,
        referenciaId: id,
        operador,
      });
    });
  }

  async definirMinimo(
    itemTipo: ItemDeEstoque,
    id: string,
    minimo: number | null
  ): Promise<void> {
    if (minimo !== null && (!Number.isFinite(minimo) || minimo < 0)) {
      throw new Error("O estoque mínimo deve ser zero ou maior.");
    }

    await this.dadosDoItem(itemTipo, id);

    if (itemTipo === "INSUMO") {
      await prisma.insumo.update({
        where: { id },
        data: { estoqueMinimo: minimo },
      });
    } else {
      await prisma.fichaTecnica.update({
        where: { id },
        data: { estoqueMinimo: minimo },
      });
    }
  }

  // ---------- produção de lotes ----------

  async previsaoDeProducao(
    fichaId: string,
    quantidadePlanejada: number
  ): Promise<PrevisaoDeProducao> {
    const { contexto, fichas } = await this.carregarContexto();

    const ficha = fichas.find((candidata) => candidata.id === fichaId);

    if (
      !ficha ||
      ficha.tipo !== "PREPARACAO" ||
      !ficha.rendimento ||
      ficha.rendimento <= 0
    ) {
      throw new Error("Preparação não encontrada ou sem rendimento.");
    }

    if (!Number.isFinite(quantidadePlanejada) || quantidadePlanejada <= 0) {
      throw new Error("A quantidade a produzir deve ser maior que zero.");
    }

    const resultado = consumoDaFicha(
      ficha,
      quantidadePlanejada / ficha.rendimento,
      contexto
    );

    const somas = await this.somaDosMovimentos(prisma);

    return {
      consumos: resultado.consumos.map((consumo) => {
        const saldoAtual =
          somas.get(`${consumo.itemTipo}:${consumo.id}`) ?? 0;

        return {
          ...consumo,
          saldoAtual,
          saldoDepois: arredondar(saldoAtual - consumo.quantidade),
        };
      }),
      avisos: resultado.avisos,
    };
  }

  // Produz um lote: baixa os insumos (e preparações) usados, dá entrada na
  // preparação pelo rendimento REAL e guarda o custo por unidade do lote.
  async produzirLote(dados: {
    fichaId: string;
    quantidadePlanejada: number;
    quantidadeProduzida: number;
    validade?: string;
    observacao?: string;
    operador?: string | null;

    // Onde o lote é guardado: freezer (padrão, validade do congelado) ou geladeira.
    congelar?: boolean;

    // Em quais gavetas o lote foi dividido (a soma deve ser o rendimento real).
    gavetas?: { gavetaId: string; quantidade: number }[];
  }): Promise<{ lote: LoteDeProducao; avisos: string[] }> {
    if (
      !Number.isFinite(dados.quantidadeProduzida) ||
      dados.quantidadeProduzida <= 0
    ) {
      throw new Error("Informe quanto rendeu de verdade (maior que zero).");
    }

    const previsao = await this.previsaoDeProducao(
      dados.fichaId,
      dados.quantidadePlanejada
    );

    const { contexto, fichas } = await this.carregarContexto();

    const ficha = fichas.find((candidata) => candidata.id === dados.fichaId);

    if (!ficha || !ficha.rendimento || !ficha.unidadeRendimento) {
      throw new Error("Preparação não encontrada ou sem rendimento.");
    }

    const multiplicador = dados.quantidadePlanejada / ficha.rendimento;

    const custoDaReceita = calcularCustoFichaTecnica(ficha, contexto);

    // Custo dos insumos consumidos dividido pelo que realmente rendeu.
    const custoDoLote =
      (custoDaReceita.custoTotal * multiplicador) / dados.quantidadeProduzida;

    const avisos = [...previsao.avisos];

    for (const consumo of previsao.consumos) {
      if (consumo.saldoDepois < 0) {
        avisos.push(
          `O estoque de ${consumo.nome} ficou negativo (${consumo.saldoDepois} ${consumo.unidade}). Confira a contagem.`
        );
      }
    }

    // Onde o lote entra e até quando vale (norma adotada, editável no sistema).
    const kanban = getKanbanService();

    const [regras, configuracao] = await Promise.all([
      kanban.listarRegras(),
      kanban.obterConfiguracao(),
    ]);

    const congelar = dados.congelar !== false;

    const producaoEm = new Date();

    const validadePadrao = congelar
      ? validadeDoCongelado(
          producaoEm,
          regras,
          configuracao.temperaturaFreezerC
        ).validadeAte
      : new Date(
          producaoEm.getTime() +
            (ficha.validadeDias ?? diasDaRegra(regras, "RESFRIADO_DEMAIS")) *
              86400000
        );

    const validade = dados.validade
      ? new Date(`${dados.validade}T12:00:00`)
      : validadePadrao;

    const localDaEntrada = congelar ? "FREEZER" : "GELADEIRA";

    // Divisão do lote em gavetas (opcional).
    const divisao = dados.gavetas?.filter((item) => item.quantidade > 0) ?? [];

    if (divisao.length > 0) {
      const soma = divisao.reduce((total, item) => total + item.quantidade, 0);

      if (Math.abs(soma - dados.quantidadeProduzida) > 0.001) {
        throw new Error(
          "A soma das gavetas deve ser igual ao que rendeu de verdade."
        );
      }

      const existentes = await prisma.gavetaEstoque.findMany({
        where: {
          empresaId: this.empresaId,
          ativo: true,
          id: { in: divisao.map((item) => item.gavetaId) },
        },
      });

      if (existentes.length !== new Set(divisao.map((item) => item.gavetaId)).size) {
        throw new Error("Gaveta não encontrada ou inativa.");
      }
    }

    const lote = await prisma.$transaction(async (tx) => {
      const criado = await tx.producaoLote.create({
        data: {
          empresaId: this.empresaId,
          fichaTecnicaId: ficha.id,
          quantidadePlanejada: dados.quantidadePlanejada,
          quantidadeProduzida: dados.quantidadeProduzida,
          unidade: ficha.unidadeRendimento as string,
          custoUnitario: arredondar(custoDoLote),
          validade,
          observacao: dados.observacao?.trim() || null,
        },
      });

      for (const consumo of previsao.consumos) {
        await tx.movimentoEstoque.create({
          data: {
            empresaId: this.empresaId,
            itemTipo: consumo.itemTipo,
            ...this.chaveDoItem(consumo.itemTipo, consumo.id),
            tipo: "PRODUCAO_CONSUMO",
            quantidade: arredondar(consumo.quantidade) * -1,
            unidade: consumo.unidade,
            motivo: `Produção de ${ficha.nome}`,
            producaoLoteId: criado.id,
          },
        });
      }

      const entradas =
        divisao.length > 0
          ? divisao.map((item) => ({
              gavetaId: item.gavetaId as string | null,
              quantidade: item.quantidade,
            }))
          : [{ gavetaId: null, quantidade: dados.quantidadeProduzida }];

      for (const entrada of entradas) {
        await tx.movimentoEstoque.create({
          data: {
            empresaId: this.empresaId,
            itemTipo: "PREPARACAO",
            fichaTecnicaId: ficha.id,
            tipo: "PRODUCAO_ENTRADA",
            quantidade: arredondar(entrada.quantidade),
            unidade: ficha.unidadeRendimento as string,
            custoUnitario: arredondar(custoDoLote),
            motivo: "Lote produzido",
            producaoLoteId: criado.id,
            local: localDaEntrada,
            gavetaId: entrada.gavetaId,
            validadeAte: validade,
          },
        });
      }

      await registrarAtividade(tx, {
        entidade: "PRODUCAO",
        acao: "LOTE",
        resumo: `Lote de ${ficha.nome}: planejado ${dados.quantidadePlanejada} ${ficha.unidadeRendimento}, rendeu ${dados.quantidadeProduzida}.`,
        referenciaId: criado.id,
        operador: dados.operador,
        detalhes: {
          consumos: previsao.consumos.map((consumo) => ({
            id: consumo.id,
            nome: consumo.nome,
            quantidade: consumo.quantidade,
            unidade: consumo.unidade,
          })),
        },
      });

      return criado;
    });

    return {
      lote: {
        id: lote.id,
        fichaTecnicaId: lote.fichaTecnicaId,
        nome: ficha.nome,
        quantidadePlanejada: Number(lote.quantidadePlanejada),
        quantidadeProduzida: Number(lote.quantidadeProduzida),
        unidade: lote.unidade,
        custoUnitario:
          lote.custoUnitario !== null ? Number(lote.custoUnitario) : undefined,
        validade: lote.validade?.toISOString(),
        observacao: lote.observacao ?? undefined,
        criadoEm: lote.criadoEm.toISOString(),
      },
      avisos,
    };
  }

  async listarLotes(limite = 30): Promise<LoteDeProducao[]> {
    const lotes = await prisma.producaoLote.findMany({
      where: { empresaId: this.empresaId },
      include: { fichaTecnica: true },
      orderBy: { criadoEm: "desc" },
      take: Math.min(Math.max(limite, 1), 200),
    });

    return lotes.map((lote) => ({
      id: lote.id,
      fichaTecnicaId: lote.fichaTecnicaId,
      nome: lote.fichaTecnica.nome,
      quantidadePlanejada: Number(lote.quantidadePlanejada),
      quantidadeProduzida: Number(lote.quantidadeProduzida),
      unidade: lote.unidade,
      custoUnitario:
        lote.custoUnitario !== null ? Number(lote.custoUnitario) : undefined,
      validade: lote.validade?.toISOString(),
      observacao: lote.observacao ?? undefined,
      criadoEm: lote.criadoEm.toISOString(),
    }));
  }
}

let instancia: EstoqueService | null = null;

export function getEstoqueService(): EstoqueService {
  if (!instancia) {
    instancia = new EstoqueService();
  }

  return instancia;
}
