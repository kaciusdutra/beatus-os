import type {
  ChecklistRepositoryPort,
  ExecucaoSalva,
  ItemDoModeloSalvo,
} from "../repositories/checklistRepositoryPort";

import {
  CHECKLIST_PADRAO,
  ROTULO_DO_TIPO,
  TIPOS_DE_CHECKLIST,
  avaliarVerificacao,
  itemCumprido,
  problemaNoItemDoModelo,
  situacaoDoChecklist,
  tiposDoDia,
  type FatosDoDia,
  type ItemDoChecklist,
  type ItemDoModelo,
  type SituacaoDoChecklist,
  type TipoDeChecklist,
} from "./checklist";

import {
  resolverHorarioDoDia,
  textoDaData,
  type ConfiguracaoDeHorarios,
} from "./horarios";

export interface EstoqueDoDia {
  abaixoDoMinimo: { nome: string; saldo: number; minimo: number; unidade: string }[];
  aProduzir: { nome: string; saldo: number; minimo: number; unidade: string }[];
  cartoesVencidos: { nome: string; local?: string; quantidade: number; unidade: string }[];
  cartoesVencendo: { nome: string; local?: string; quantidade: number; unidade: string; validadeAte?: string }[];
  descongelando: { nome: string; quantidade: number; unidade: string; validadeAte?: string }[];
}

// De onde o checklist tira os fatos do dia (estoque, validade, temperatura).
export interface FatosDoDiaPort {
  carregar(data: string): Promise<FatosDoDia>;

  estoqueDoDia(): Promise<EstoqueDoDia>;
}

export interface HorariosPort {
  obter(): Promise<ConfiguracaoDeHorarios>;
}

export type RegistrarNoDiario = (dados: {
  acao: string;
  resumo: string;
  referenciaId?: string;
  operador?: string | null;
}) => Promise<void>;

export interface ChecklistDoTipo {
  tipo: TipoDeChecklist;
  rotulo: string;
  execucaoId: string;
  concluido: boolean;
  concluidoEm?: string;
  concluidoPor?: string;
  itens: ItemDoChecklist[];
  situacao: SituacaoDoChecklist;
}

export interface ChecklistDoDia {
  data: string;
  horario: { aberto: boolean; abertura?: string; fechamento?: string; excecao: boolean };
  tipos: ChecklistDoTipo[];
}

export interface EstadoDoChecklist {
  data: string;
  // O dia de venda tem checklist de abertura? Se não tem, não há o que concluir.
  temAbertura: boolean;
  aberturaConcluida: boolean;
  temFechamento: boolean;
  fechamentoConcluido: boolean;
}

const MAXIMO_DE_ITENS = 40;

export class ChecklistDoDiaService {
  constructor(
    private readonly repository: ChecklistRepositoryPort,
    private readonly fatos: FatosDoDiaPort,
    private readonly horarios: HorariosPort,
    // Diário da operação (Registro de atividades); opcional.
    private readonly registrar?: RegistrarNoDiario
  ) {}

  // ---------- Modelo (lista editável) ----------

  async modelo(): Promise<Record<TipoDeChecklist, ItemDoModeloSalvo[]>> {
    await this.repository.semearModeloSeVazio(CHECKLIST_PADRAO);

    const [abertura, fechamento, producao] = await Promise.all(
      TIPOS_DE_CHECKLIST.map((tipo) => this.repository.listarModelo(tipo))
    );

    return { ABERTURA: abertura, FECHAMENTO: fechamento, PRODUCAO: producao };
  }

  async salvarModelo(
    tipo: TipoDeChecklist,
    itens: ItemDoModelo[],
    operador?: string | null
  ): Promise<ItemDoModeloSalvo[]> {
    if (!TIPOS_DE_CHECKLIST.includes(tipo)) {
      throw new Error("Tipo de checklist inválido.");
    }

    if (!Array.isArray(itens) || itens.length > MAXIMO_DE_ITENS) {
      throw new Error(`Informe a lista de itens (no máximo ${MAXIMO_DE_ITENS}).`);
    }

    for (const item of itens) {
      const problema = problemaNoItemDoModelo(item);

      if (problema) {
        throw new Error(problema);
      }
    }

    await this.repository.semearModeloSeVazio(CHECKLIST_PADRAO);

    await this.repository.substituirModelo(tipo, itens);

    await this.registrar?.({
      acao: "CHECKLIST_EDITADO",
      resumo: `Lista do checklist de ${ROTULO_DO_TIPO[tipo].toLowerCase()} editada: ${itens.length} item(ns), ${itens.filter((item) => item.obrigatorio).length} obrigatório(s).`,
      operador,
    });

    return this.repository.listarModelo(tipo);
  }

  // ---------- Checklist do dia ----------

  // O checklist de hoje: cria o de cada tipo do dia como cópia da lista atual, se
  // ainda não existir, e avalia os itens automáticos.
  async doDia(agora: Date = new Date()): Promise<ChecklistDoDia> {
    const data = textoDaData(agora);

    const configuracao = await this.horarios.obter();

    const horario = resolverHorarioDoDia(data, configuracao);

    await this.repository.semearModeloSeVazio(CHECKLIST_PADRAO);

    const tipos: ChecklistDoTipo[] = [];

    let fatos: FatosDoDia | null = null;

    for (const tipo of tiposDoDia(horario)) {
      let execucao = await this.repository.buscarExecucao(data, tipo);

      if (!execucao) {
        execucao = await this.repository.criarExecucao(data, tipo, await this.repository.listarModelo(tipo));
      }

      if (!fatos && execucao.itens.some((item) => item.verificacao)) {
        fatos = await this.fatos.carregar(data);
      }

      tipos.push(this.montarTipo(execucao, fatos));
    }

    return {
      data,
      horario: {
        aberto: horario.aberto,
        abertura: horario.abertura,
        fechamento: horario.fechamento,
        excecao: horario.origem === "EXCECAO",
      },
      tipos,
    };
  }

  private montarTipo(execucao: ExecucaoSalva, fatos: FatosDoDia | null): ChecklistDoTipo {
    const itens: ItemDoChecklist[] = execucao.itens.map((item) => {
      const automatico = item.verificacao && fatos ? avaliarVerificacao(item.verificacao, fatos) : undefined;

      return {
        id: item.id,
        titulo: item.titulo,
        categoria: item.categoria,
        obrigatorio: item.obrigatorio,
        verificacao: item.verificacao,
        feito: item.feito,
        feitoPor: item.feitoPor,
        feitoEm: item.feitoEm,
        observacao: item.observacao,
        automatico,
        cumprido: itemCumprido({ feito: item.feito, automatico }),
      };
    });

    return {
      tipo: execucao.tipo,
      rotulo: ROTULO_DO_TIPO[execucao.tipo],
      execucaoId: execucao.id,
      concluido: Boolean(execucao.concluidoEm),
      concluidoEm: execucao.concluidoEm,
      concluidoPor: execucao.concluidoPor,
      itens,
      situacao: situacaoDoChecklist(itens),
    };
  }

  // Marca ou desmarca um item à mão. Item automático com problema só se marca
  // com uma observação (o Kacius assume o que está fazendo).
  async marcarItem(
    itemId: string,
    feito: boolean,
    observacao: string | undefined,
    operador?: string | null
  ): Promise<void> {
    const execucao = await this.repository.buscarExecucaoDoItem(itemId);

    if (!execucao) {
      throw new Error("Item do checklist não encontrado.");
    }

    if (execucao.concluidoEm) {
      throw new Error("O checklist já foi concluído. Reabra para alterar.");
    }

    const item = execucao.itens.find((candidato) => candidato.id === itemId)!;

    const texto = observacao?.trim().slice(0, 200) || undefined;

    if (feito && item.verificacao) {
      const resultado = avaliarVerificacao(item.verificacao, await this.fatos.carregar(execucao.data));

      if (!resultado.ok && !texto) {
        throw new Error(`O sistema ainda não confirma este item (${resultado.detalhe}). Para marcar mesmo assim, escreva uma observação.`);
      }
    }

    await this.repository.marcarItem(itemId, { feito, observacao: texto, operador });

    await this.registrar?.({
      acao: "CHECKLIST_ITEM",
      resumo: `Checklist de ${ROTULO_DO_TIPO[execucao.tipo].toLowerCase()}: "${item.titulo}" ${feito ? "marcado como feito" : "desmarcado"}${texto ? ` (${texto})` : ""}.`,
      referenciaId: execucao.id,
      operador,
    });
  }

  async concluir(execucaoId: string, operador?: string | null): Promise<void> {
    const execucao = await this.repository.buscarExecucaoPorId(execucaoId);

    if (!execucao) {
      throw new Error("Checklist não encontrado.");
    }

    if (execucao.concluidoEm) {
      throw new Error("Este checklist já foi concluído.");
    }

    const fatos = execucao.itens.some((item) => item.verificacao)
      ? await this.fatos.carregar(execucao.data)
      : null;

    const { situacao } = this.montarTipo(execucao, fatos);

    if (!situacao.podeConcluir) {
      throw new Error(`Ainda faltam itens obrigatórios: ${situacao.obrigatoriosPendentes.join("; ")}.`);
    }

    await this.repository.concluir(execucaoId, operador);

    await this.registrar?.({
      acao: "CHECKLIST_CONCLUIDO",
      resumo: `Checklist de ${ROTULO_DO_TIPO[execucao.tipo].toLowerCase()} de ${execucao.data.split("-").reverse().join("/")} concluído (${situacao.cumpridos} de ${situacao.total} itens).`,
      referenciaId: execucaoId,
      operador,
    });
  }

  async reabrir(execucaoId: string, operador?: string | null): Promise<void> {
    const execucao = await this.repository.buscarExecucaoPorId(execucaoId);

    if (!execucao) {
      throw new Error("Checklist não encontrado.");
    }

    if (!execucao.concluidoEm) {
      throw new Error("Este checklist não está concluído.");
    }

    await this.repository.reabrir(execucaoId);

    await this.registrar?.({
      acao: "CHECKLIST_REABERTO",
      resumo: `Checklist de ${ROTULO_DO_TIPO[execucao.tipo].toLowerCase()} de ${execucao.data.split("-").reverse().join("/")} reaberto.`,
      referenciaId: execucaoId,
      operador,
    });
  }

  // ---------- Estado (o sistema todo consulta) ----------

  // Leve: não cria nada nem avalia itens. Diz se o de abertura e o de fechamento
  // de hoje já foram concluídos.
  async estado(agora: Date = new Date()): Promise<EstadoDoChecklist> {
    const data = textoDaData(agora);

    const [configuracao, execucoes] = await Promise.all([
      this.horarios.obter(),
      this.repository.listarExecucoesDoDia(data),
    ]);

    const tipos = tiposDoDia(resolverHorarioDoDia(data, configuracao));

    const concluido = (tipo: TipoDeChecklist) =>
      execucoes.some((execucao) => execucao.tipo === tipo && Boolean(execucao.concluidoEm));

    return {
      data,
      temAbertura: tipos.includes("ABERTURA"),
      aberturaConcluida: concluido("ABERTURA"),
      temFechamento: tipos.includes("FECHAMENTO"),
      fechamentoConcluido: concluido("FECHAMENTO"),
    };
  }

  async estoqueDoDia(): Promise<EstoqueDoDia> {
    return this.fatos.estoqueDoDia();
  }
}
