import "server-only";

import { prisma } from "@/lib/prisma";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import {
  FONTE_DAS_REGRAS,
  REGRAS_PADRAO,
  categoriaDoCongelado,
  diasDaRegra,
  situacaoDaValidade,
  validadeDoDescongelado,
} from "../calcularValidade";

import type {
  CartaoAProduzir,
  CartaoDoQuadro,
  ConfiguracaoDoEstoque,
  DadosDaEtiqueta,
  GavetaDoEstoque,
  LocalDoEstoque,
  QuadroDoEstoque,
  RegraDeValidadeSalva,
} from "../../types/estoque";

import { ROTULO_DO_LOCAL } from "../../types/estoque";

function arredondar(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}

// Para onde um cartão pode andar. Do descongelado não se volta ao freezer
// (norma: proibido recongelar), e do freezer só se vai para a geladeira.
const TRANSICOES: Record<string, LocalDoEstoque[]> = {
  FREEZER: ["DESCONGELANDO"],
  GELADEIRA: ["COZINHA"],
  DESCONGELANDO: ["COZINHA"],
  SOBRA: ["COZINHA"],
  COZINHA: ["SOBRA"],
};

const LOCAIS = [
  "FREEZER",
  "GELADEIRA",
  "DESCONGELANDO",
  "COZINHA",
  "SOBRA",
] as const;

function ehLocal(valor: unknown): valor is LocalDoEstoque {
  return LOCAIS.includes(valor as LocalDoEstoque);
}

export function codigoDoLote(criadoEm: Date, loteId: string): string {
  const aa = String(criadoEm.getFullYear()).slice(2);
  const mm = String(criadoEm.getMonth() + 1).padStart(2, "0");
  const dd = String(criadoEm.getDate()).padStart(2, "0");

  return `L${aa}${mm}${dd}-${loteId.slice(0, 4).toUpperCase()}`;
}

export class KanbanService {
  private readonly contexto = criarContextoDesenvolvimento();

  private get empresaId(): string {
    return this.contexto.empresaId;
  }

  // ---------- regras de validade e temperaturas ----------

  async listarRegras(): Promise<RegraDeValidadeSalva[]> {
    let regras = await prisma.regraValidade.findMany({
      where: { empresaId: this.empresaId },
      orderBy: { categoria: "asc" },
    });

    // Primeira vez: grava o ponto de partida (a norma adotada), editável.
    if (regras.length === 0) {
      await prisma.regraValidade.createMany({
        data: REGRAS_PADRAO.map((regra) => ({
          empresaId: this.empresaId,
          categoria: regra.categoria,
          descricao: regra.descricao,
          conservacao: regra.conservacao,
          temperatura: regra.temperatura,
          dias: regra.dias,
          fonte: FONTE_DAS_REGRAS,
        })),
        skipDuplicates: true,
      });

      regras = await prisma.regraValidade.findMany({
        where: { empresaId: this.empresaId },
        orderBy: { categoria: "asc" },
      });
    }

    return regras.map((regra) => ({
      categoria: regra.categoria,
      descricao: regra.descricao,
      conservacao: regra.conservacao,
      temperatura: regra.temperatura,
      dias: regra.dias,
      fonte: regra.fonte ?? undefined,
    }));
  }

  async salvarRegra(
    categoria: string,
    dias: number,
    operador?: string | null
  ): Promise<void> {
    if (!Number.isInteger(dias) || dias < 0 || dias > 3650) {
      throw new Error("Os dias devem ser um número inteiro entre 0 e 3650.");
    }

    await this.listarRegras();

    const regra = await prisma.regraValidade.findFirst({
      where: { empresaId: this.empresaId, categoria },
    });

    if (!regra) {
      throw new Error("Regra de validade não encontrada.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.regraValidade.update({
        where: { id: regra.id },
        data: { dias },
      });

      await registrarAtividade(tx, {
        entidade: "ESTOQUE",
        acao: "REGRA_VALIDADE",
        resumo: `Validade "${regra.descricao}" mudou de ${regra.dias} para ${dias} dia(s).`,
        referenciaId: regra.id,
        operador,
      });
    });
  }

  async obterConfiguracao(): Promise<ConfiguracaoDoEstoque> {
    const config = await prisma.configuracaoEstoque.findUnique({
      where: { empresaId: this.empresaId },
    });

    return {
      temperaturaFreezerC:
        config?.temperaturaFreezerC != null
          ? Number(config.temperaturaFreezerC)
          : undefined,
      temperaturaGeladeiraC:
        config?.temperaturaGeladeiraC != null
          ? Number(config.temperaturaGeladeiraC)
          : undefined,
    };
  }

  async salvarTemperaturas(
    freezer: number | null,
    geladeira: number | null,
    operador?: string | null
  ): Promise<void> {
    for (const valor of [freezer, geladeira]) {
      if (valor !== null && (!Number.isFinite(valor) || valor < -60 || valor > 30)) {
        throw new Error("Informe uma temperatura válida em °C.");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.configuracaoEstoque.upsert({
        where: { empresaId: this.empresaId },
        create: {
          empresaId: this.empresaId,
          temperaturaFreezerC: freezer,
          temperaturaGeladeiraC: geladeira,
        },
        update: {
          temperaturaFreezerC: freezer,
          temperaturaGeladeiraC: geladeira,
        },
      });

      await registrarAtividade(tx, {
        entidade: "ESTOQUE",
        acao: "TEMPERATURA",
        resumo: `Temperaturas: freezer ${freezer ?? "não medida"} °C, geladeira ${geladeira ?? "não medida"} °C.`,
        operador,
      });
    });
  }

  // ---------- gavetas ----------

  async listarGavetas(): Promise<GavetaDoEstoque[]> {
    const [gavetas, somas] = await Promise.all([
      prisma.gavetaEstoque.findMany({
        where: { empresaId: this.empresaId },
        include: { fichaTecnica: true },
        orderBy: { nome: "asc" },
      }),

      prisma.movimentoEstoque.groupBy({
        by: ["gavetaId"],
        where: {
          empresaId: this.empresaId,
          gavetaId: { not: null },
          local: { in: ["FREEZER", "GELADEIRA"] },
        },
        _sum: { quantidade: true },
      }),
    ]);

    return gavetas.map((gaveta) => ({
      id: gaveta.id,
      nome: gaveta.nome,
      fichaTecnicaId: gaveta.fichaTecnicaId ?? undefined,
      preparacao: gaveta.fichaTecnica?.nome,
      capacidade:
        gaveta.capacidade !== null ? Number(gaveta.capacidade) : undefined,
      ativo: gaveta.ativo,
      conteudo: arredondar(
        Number(
          somas.find((soma) => soma.gavetaId === gaveta.id)?._sum.quantidade ??
            0
        )
      ),
      unidade: gaveta.fichaTecnica?.unidadeRendimento ?? undefined,
    }));
  }

  async criarGaveta(dados: {
    nome: string;
    fichaTecnicaId?: string;
    capacidade?: number;
    operador?: string | null;
  }): Promise<void> {
    if (!dados.nome.trim()) {
      throw new Error("Dê um nome à gaveta.");
    }

    if (
      dados.capacidade !== undefined &&
      (!Number.isFinite(dados.capacidade) || dados.capacidade <= 0)
    ) {
      throw new Error("A capacidade deve ser maior que zero (ou fique em branco).");
    }

    const existente = await prisma.gavetaEstoque.findFirst({
      where: { empresaId: this.empresaId, nome: dados.nome.trim() },
    });

    if (existente) {
      throw new Error("Já existe uma gaveta com este nome.");
    }

    await prisma.$transaction(async (tx) => {
      const criada = await tx.gavetaEstoque.create({
        data: {
          empresaId: this.empresaId,
          nome: dados.nome.trim(),
          fichaTecnicaId: dados.fichaTecnicaId || null,
          capacidade: dados.capacidade ?? null,
        },
      });

      await registrarAtividade(tx, {
        entidade: "ESTOQUE",
        acao: "GAVETA",
        resumo: `Gaveta "${criada.nome}" criada.`,
        referenciaId: criada.id,
        operador: dados.operador,
      });
    });
  }

  async atualizarGaveta(
    id: string,
    dados: {
      nome?: string;
      fichaTecnicaId?: string | null;
      capacidade?: number | null;
      ativo?: boolean;
    }
  ): Promise<void> {
    const gaveta = await prisma.gavetaEstoque.findFirst({
      where: { id, empresaId: this.empresaId },
    });

    if (!gaveta) {
      throw new Error("Gaveta não encontrada.");
    }

    if (dados.nome !== undefined && !dados.nome.trim()) {
      throw new Error("Dê um nome à gaveta.");
    }

    if (
      dados.capacidade !== undefined &&
      dados.capacidade !== null &&
      (!Number.isFinite(dados.capacidade) || dados.capacidade <= 0)
    ) {
      throw new Error("A capacidade deve ser maior que zero (ou fique em branco).");
    }

    await prisma.gavetaEstoque.update({
      where: { id },
      data: {
        ...(dados.nome !== undefined ? { nome: dados.nome.trim() } : {}),
        ...(dados.fichaTecnicaId !== undefined
          ? { fichaTecnicaId: dados.fichaTecnicaId || null }
          : {}),
        ...(dados.capacidade !== undefined
          ? { capacidade: dados.capacidade }
          : {}),
        ...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
      },
    });
  }

  // ---------- quadro ----------

  async quadro(agora: Date = new Date()): Promise<QuadroDoEstoque> {
    const [movimentos, preparacoes, somas] = await Promise.all([
      prisma.movimentoEstoque.findMany({
        where: {
          empresaId: this.empresaId,
          itemTipo: "PREPARACAO",
          local: { not: null },
        },
        include: { gaveta: true, producaoLote: true, fichaTecnica: true },
        orderBy: { criadoEm: "asc" },
      }),

      prisma.fichaTecnica.findMany({
        where: {
          empresaId: this.empresaId,
          tipo: "PREPARACAO",
          ativo: true,
          estoqueMinimo: { not: null },
        },
      }),

      prisma.movimentoEstoque.groupBy({
        by: ["fichaTecnicaId"],
        where: { empresaId: this.empresaId, itemTipo: "PREPARACAO" },
        _sum: { quantidade: true },
      }),
    ]);

    const grupos = new Map<string, CartaoDoQuadro>();

    for (const movimento of movimentos) {
      if (!movimento.fichaTecnicaId || !ehLocal(movimento.local)) {
        continue;
      }

      const chave = `${movimento.producaoLoteId ?? "-"}|${movimento.local}|${movimento.gavetaId ?? "-"}`;

      const quantidade = Number(movimento.quantidade);

      const atual = grupos.get(chave);

      if (!atual) {
        grupos.set(chave, {
          chave,
          fichaTecnicaId: movimento.fichaTecnicaId,
          nome: movimento.fichaTecnica?.nome ?? "Preparação",
          unidade: movimento.unidade,
          producaoLoteId: movimento.producaoLoteId ?? undefined,
          loteCodigo: movimento.producaoLote
            ? codigoDoLote(
                movimento.producaoLote.criadoEm,
                movimento.producaoLote.id
              )
            : undefined,
          gavetaId: movimento.gavetaId ?? undefined,
          gaveta: movimento.gaveta?.nome,
          local: movimento.local,
          quantidade,
          validadeAte:
            quantidade > 0 ? movimento.validadeAte?.toISOString() : undefined,
          descongeladoEm:
            quantidade > 0 ? movimento.descongeladoEm?.toISOString() : undefined,
          situacao: "OK",
        });

        continue;
      }

      atual.quantidade += quantidade;

      if (quantidade > 0) {
        // Vale a validade mais curta entre as entradas naquele lugar.
        if (
          movimento.validadeAte &&
          (!atual.validadeAte ||
            movimento.validadeAte.toISOString() < atual.validadeAte)
        ) {
          atual.validadeAte = movimento.validadeAte.toISOString();
        }

        if (movimento.descongeladoEm) {
          atual.descongeladoEm = movimento.descongeladoEm.toISOString();
        }
      }
    }

    const cartoes = [...grupos.values()]
      .map((cartao) => ({
        ...cartao,
        quantidade: arredondar(cartao.quantidade),
      }))
      .filter((cartao) => cartao.quantidade > 0.00005)
      .map((cartao) => ({
        ...cartao,
        situacao: situacaoDaValidade(
          cartao.validadeAte ? new Date(cartao.validadeAte) : null,
          agora,
          cartao.local === "FREEZER"
        ),
      }))
      .sort((a, b) =>
        (a.validadeAte ?? "9999").localeCompare(b.validadeAte ?? "9999")
      );

    const saldoPorFicha = new Map(
      somas.map((soma) => [
        soma.fichaTecnicaId,
        Number(soma._sum.quantidade ?? 0),
      ])
    );

    const aProduzir: CartaoAProduzir[] = preparacoes
      .map((ficha) => ({
        fichaTecnicaId: ficha.id,
        nome: ficha.nome,
        unidade: ficha.unidadeRendimento ?? "",
        saldo: arredondar(saldoPorFicha.get(ficha.id) ?? 0),
        minimo: Number(ficha.estoqueMinimo),
      }))
      .filter((item) => item.saldo < item.minimo);

    return { cartoes, aProduzir };
  }

  private async cartaoNoLocal(
    tx: Pick<typeof prisma, "movimentoEstoque">,
    dados: {
      fichaTecnicaId: string;
      producaoLoteId?: string;
      gavetaId?: string;
      local: LocalDoEstoque;
    }
  ) {
    const movimentos = await tx.movimentoEstoque.findMany({
      where: {
        empresaId: this.empresaId,
        itemTipo: "PREPARACAO",
        fichaTecnicaId: dados.fichaTecnicaId,
        local: dados.local,
        producaoLoteId: dados.producaoLoteId ?? null,
        gavetaId: dados.gavetaId ?? null,
      },
    });

    const quantidade = arredondar(
      movimentos.reduce((soma, m) => soma + Number(m.quantidade), 0)
    );

    const entradas = movimentos.filter((m) => Number(m.quantidade) > 0);

    const validades = entradas
      .map((m) => m.validadeAte)
      .filter((v): v is Date => v !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const descongelado = entradas
      .map((m) => m.descongeladoEm)
      .filter((v): v is Date => v !== null)
      .sort((a, b) => b.getTime() - a.getTime());

    return {
      quantidade,
      validadeAte: validades[0],
      descongeladoEm: descongelado[0],
      unidade: movimentos[0]?.unidade ?? "",
    };
  }

  // Anda com um cartão (ou parte dele) para outra coluna.
  async moverCartao(dados: {
    fichaTecnicaId: string;
    producaoLoteId?: string;
    gavetaId?: string;
    deLocal: string;
    paraLocal: string;
    quantidade: number;
    operador?: string | null;
  }): Promise<void> {
    if (!ehLocal(dados.deLocal) || !ehLocal(dados.paraLocal)) {
      throw new Error("Lugar inválido.");
    }

    if (!TRANSICOES[dados.deLocal]?.includes(dados.paraLocal)) {
      throw new Error(
        dados.deLocal === "DESCONGELANDO" && dados.paraLocal === "FREEZER"
          ? "O que descongelou não pode ser recongelado."
          : `Não dá para passar de "${ROTULO_DO_LOCAL[dados.deLocal]}" para "${ROTULO_DO_LOCAL[dados.paraLocal]}".`
      );
    }

    if (!Number.isFinite(dados.quantidade) || dados.quantidade <= 0) {
      throw new Error("A quantidade deve ser maior que zero.");
    }

    const [ficha, regras] = await Promise.all([
      prisma.fichaTecnica.findFirst({
        where: {
          id: dados.fichaTecnicaId,
          empresaId: this.empresaId,
          tipo: "PREPARACAO",
        },
      }),
      this.listarRegras(),
    ]);

    if (!ficha) {
      throw new Error("Preparação não encontrada.");
    }

    const agora = new Date();

    await prisma.$transaction(async (tx) => {
      const origem = await this.cartaoNoLocal(tx, {
        fichaTecnicaId: ficha.id,
        producaoLoteId: dados.producaoLoteId,
        gavetaId: dados.gavetaId,
        local: dados.deLocal as LocalDoEstoque,
      });

      if (dados.quantidade > origem.quantidade + 0.00005) {
        throw new Error(
          `Só há ${origem.quantidade} ${origem.unidade} neste cartão.`
        );
      }

      if (origem.validadeAte && origem.validadeAte.getTime() <= agora.getTime()) {
        throw new Error("Este lote venceu: descarte em vez de usar.");
      }

      const quantidade = arredondar(dados.quantidade);

      let validadeNova = origem.validadeAte;

      let descongeladoEm = origem.descongeladoEm;

      if (dados.paraLocal === "DESCONGELANDO") {
        // Validade do resfriado: dias da ficha, ou a norma de carne moída (a mais curta).
        const diasResfriado =
          ficha.validadeDias ?? diasDaRegra(regras, "RESFRIADO_CARNE_MOIDA");

        descongeladoEm = agora;

        validadeNova = validadeDoDescongelado(
          agora,
          diasResfriado,
          origem.validadeAte
        );
      }

      const base = {
        empresaId: this.empresaId,
        itemTipo: "PREPARACAO",
        fichaTecnicaId: ficha.id,
        tipo: "TRANSFERENCIA",
        unidade: origem.unidade,
        producaoLoteId: dados.producaoLoteId ?? null,
        gavetaId: dados.gavetaId ?? null,
        motivo: `${ROTULO_DO_LOCAL[dados.deLocal as LocalDoEstoque]} → ${ROTULO_DO_LOCAL[dados.paraLocal as LocalDoEstoque]}`,
      };

      await tx.movimentoEstoque.create({
        data: {
          ...base,
          local: dados.deLocal,
          quantidade: quantidade * -1,
        },
      });

      await tx.movimentoEstoque.create({
        data: {
          ...base,
          local: dados.paraLocal,
          quantidade,
          validadeAte: validadeNova ?? null,
          descongeladoEm: descongeladoEm ?? null,
        },
      });

      await registrarAtividade(tx, {
        entidade: "ESTOQUE",
        acao: "MOVER",
        resumo: `${ficha.nome}: ${quantidade} ${origem.unidade} de "${ROTULO_DO_LOCAL[dados.deLocal as LocalDoEstoque]}" para "${ROTULO_DO_LOCAL[dados.paraLocal as LocalDoEstoque]}"${validadeNova ? ` (validade até ${validadeNova.toLocaleString("pt-BR")})` : ""}.`,
        referenciaId: dados.producaoLoteId ?? ficha.id,
        operador: dados.operador,
      });
    });
  }

  // Descarte (venceu, estragou): vira perda no estoque, com motivo.
  async descartarCartao(dados: {
    fichaTecnicaId: string;
    producaoLoteId?: string;
    gavetaId?: string;
    local: string;
    quantidade: number;
    motivo: string;
    operador?: string | null;
  }): Promise<void> {
    if (!ehLocal(dados.local)) {
      throw new Error("Lugar inválido.");
    }

    if (!dados.motivo.trim()) {
      throw new Error("Informe o motivo do descarte.");
    }

    if (!Number.isFinite(dados.quantidade) || dados.quantidade <= 0) {
      throw new Error("A quantidade deve ser maior que zero.");
    }

    const ficha = await prisma.fichaTecnica.findFirst({
      where: {
        id: dados.fichaTecnicaId,
        empresaId: this.empresaId,
        tipo: "PREPARACAO",
      },
    });

    if (!ficha) {
      throw new Error("Preparação não encontrada.");
    }

    await prisma.$transaction(async (tx) => {
      const origem = await this.cartaoNoLocal(tx, {
        fichaTecnicaId: ficha.id,
        producaoLoteId: dados.producaoLoteId,
        gavetaId: dados.gavetaId,
        local: dados.local as LocalDoEstoque,
      });

      if (dados.quantidade > origem.quantidade + 0.00005) {
        throw new Error(
          `Só há ${origem.quantidade} ${origem.unidade} neste cartão.`
        );
      }

      const quantidade = arredondar(dados.quantidade);

      await tx.movimentoEstoque.create({
        data: {
          empresaId: this.empresaId,
          itemTipo: "PREPARACAO",
          fichaTecnicaId: ficha.id,
          tipo: "PERDA",
          quantidade: quantidade * -1,
          unidade: origem.unidade,
          motivo: dados.motivo.trim(),
          producaoLoteId: dados.producaoLoteId ?? null,
          gavetaId: dados.gavetaId ?? null,
          local: dados.local,
        },
      });

      await registrarAtividade(tx, {
        entidade: "ESTOQUE",
        acao: "DESCARTE",
        resumo: `Descarte de ${quantidade} ${origem.unidade} de ${ficha.nome} (${ROTULO_DO_LOCAL[dados.local as LocalDoEstoque]}). Motivo: ${dados.motivo.trim()}`,
        referenciaId: dados.producaoLoteId ?? ficha.id,
        operador: dados.operador,
      });
    });
  }

  // ---------- etiquetas ----------

  async dadosDaEtiqueta(dados: {
    fichaTecnicaId: string;
    producaoLoteId?: string;
    gavetaId?: string;
    local: string;
    responsavel?: string | null;
  }): Promise<DadosDaEtiqueta> {
    if (!ehLocal(dados.local) || dados.local === "COZINHA") {
      throw new Error("Não há etiqueta para este lugar.");
    }

    const [ficha, lote, gaveta, config] = await Promise.all([
      prisma.fichaTecnica.findFirst({
        where: { id: dados.fichaTecnicaId, empresaId: this.empresaId },
      }),
      dados.producaoLoteId
        ? prisma.producaoLote.findFirst({
            where: { id: dados.producaoLoteId, empresaId: this.empresaId },
          })
        : null,
      dados.gavetaId
        ? prisma.gavetaEstoque.findFirst({
            where: { id: dados.gavetaId, empresaId: this.empresaId },
          })
        : null,
      this.obterConfiguracao(),
    ]);

    if (!ficha) {
      throw new Error("Preparação não encontrada.");
    }

    const cartao = await this.cartaoNoLocal(prisma, {
      fichaTecnicaId: ficha.id,
      producaoLoteId: dados.producaoLoteId,
      gavetaId: dados.gavetaId,
      local: dados.local,
    });

    if (cartao.quantidade <= 0.00005) {
      throw new Error("Não há nada deste lote neste lugar para etiquetar.");
    }

    const regras = await this.listarRegras();

    const categoria = categoriaDoCongelado(config.temperaturaFreezerC);

    const faixaDoFreezer =
      regras.find((regra) => regra.categoria === categoria)?.temperatura ??
      "freezer";

    const geladeira =
      config.temperaturaGeladeiraC !== undefined
        ? `até ${Math.max(config.temperaturaGeladeiraC, 4)} °C`
        : "até 4 °C";

    const local = dados.local;

    const tipo =
      local === "FREEZER"
        ? "LOTE_CONGELADO"
        : local === "DESCONGELANDO"
          ? "DESCONGELAMENTO"
          : local === "SOBRA"
            ? "SOBRA"
            : "RESFRIADO";

    const avisos =
      local === "DESCONGELANDO" || local === "SOBRA"
        ? ["NÃO RECONGELAR"]
        : [];

    const preparadoEm = lote?.criadoEm ?? new Date();

    return {
      tipo,
      titulo:
        tipo === "LOTE_CONGELADO"
          ? "CONGELADO"
          : tipo === "DESCONGELAMENTO"
            ? "DESCONGELADO"
            : tipo === "SOBRA"
              ? "SOBRA"
              : "RESFRIADO",
      nome: ficha.nome,
      loteCodigo: lote ? codigoDoLote(lote.criadoEm, lote.id) : "sem lote",
      preparadoEm: preparadoEm.toISOString(),
      validadeAte: cartao.validadeAte?.toISOString(),
      descongeladoEm: cartao.descongeladoEm?.toISOString(),
      temperatura: local === "FREEZER" ? faixaDoFreezer : geladeira,
      gaveta: gaveta?.nome,
      quantidade: cartao.quantidade,
      unidade: cartao.unidade || ficha.unidadeRendimento || "",
      responsavel: dados.responsavel ?? undefined,
      avisos,
    };
  }

  async registrarImpressaoDaEtiqueta(
    resumo: string,
    copias: number,
    operador?: string | null
  ): Promise<void> {
    await registrarAtividade(prisma, {
      entidade: "ESTOQUE",
      acao: "ETIQUETA",
      resumo: `Etiqueta impressa (${copias} cópia(s)): ${resumo}`,
      operador,
    });
  }
}

let instancia: KanbanService | null = null;

export function getKanbanService(): KanbanService {
  if (!instancia) {
    instancia = new KanbanService();
  }

  return instancia;
}
