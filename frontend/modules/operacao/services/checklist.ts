import type { HorarioResolvido } from "./horarios";

// Checklist da operação: abertura, fechamento e dia de produção. Funções puras.

export type TipoDeChecklist = "ABERTURA" | "FECHAMENTO" | "PRODUCAO";

export const TIPOS_DE_CHECKLIST: TipoDeChecklist[] = ["ABERTURA", "FECHAMENTO", "PRODUCAO"];

export const ROTULO_DO_TIPO: Record<TipoDeChecklist, string> = {
  ABERTURA: "Abertura",
  FECHAMENTO: "Fechamento",
  PRODUCAO: "Dia de produção",
};

export interface ItemDoModelo {
  id?: string;
  titulo: string;
  categoria?: string;
  obrigatorio: boolean;
  // Vazio = manual; senão, uma das verificações automáticas.
  verificacao?: string;
}

// Verificações que o sistema faz sozinho. O sufixo ":N" é o número de leituras
// de temperatura no dia (a norma pede duas por dia).
export const VERIFICACOES_AUTOMATICAS: { chave: string; rotulo: string }[] = [
  { chave: "TEMPERATURA_FREEZER:1", rotulo: "Temperatura do freezer registrada (1ª leitura do dia)" },
  { chave: "TEMPERATURA_FREEZER:2", rotulo: "Temperatura do freezer registrada (2ª leitura do dia)" },
  { chave: "TEMPERATURA_GELADEIRA:1", rotulo: "Temperatura da geladeira registrada (1ª leitura do dia)" },
  { chave: "TEMPERATURA_GELADEIRA:2", rotulo: "Temperatura da geladeira registrada (2ª leitura do dia)" },
  { chave: "CARTOES_VENCIDOS", rotulo: "Nenhum cartão vencido no quadro do estoque" },
  { chave: "ESTOQUE_MINIMO", rotulo: "Nenhum item abaixo do estoque mínimo" },
];

const CHAVES_VALIDAS = VERIFICACOES_AUTOMATICAS.map((verificacao) => verificacao.chave);

// Lista inicial proposta (norma sanitária e rotina do Beatus). O Kacius edita na tela.
export const CHECKLIST_PADRAO: Record<TipoDeChecklist, ItemDoModelo[]> = {
  ABERTURA: [
    { titulo: "Registrar a temperatura do freezer", categoria: "Estoque", obrigatorio: true, verificacao: "TEMPERATURA_FREEZER:1" },
    { titulo: "Registrar a temperatura da geladeira", categoria: "Estoque", obrigatorio: true, verificacao: "TEMPERATURA_GELADEIRA:1" },
    { titulo: "Nenhum cartão vencido no quadro do estoque (descartar o que venceu)", categoria: "Estoque", obrigatorio: true, verificacao: "CARTOES_VENCIDOS" },
    { titulo: "Estoque acima do mínimo (repor o que falta)", categoria: "Estoque", obrigatorio: false, verificacao: "ESTOQUE_MINIMO" },
    { titulo: "Conferir se o blend descongelado dá para a noite", categoria: "Produção", obrigatorio: true },
    { titulo: "Higienizar bancadas, chapa e utensílios", categoria: "Higiene", obrigatorio: true },
    { titulo: "Conferir pães, embalagens e descartáveis", categoria: "Estoque", obrigatorio: true },
    { titulo: "Ligar chapa e fritadeira e conferir o gás", categoria: "Equipamentos", obrigatorio: true },
    { titulo: "Testar a impressora de tickets e a internet", categoria: "Equipamentos", obrigatorio: false },
    { titulo: "Produzir os molhos e as preparações do dia", categoria: "Produção", obrigatorio: false },
  ],
  FECHAMENTO: [
    { titulo: "Registrar a temperatura do freezer (2ª leitura do dia)", categoria: "Estoque", obrigatorio: true, verificacao: "TEMPERATURA_FREEZER:2" },
    { titulo: "Registrar a temperatura da geladeira (2ª leitura do dia)", categoria: "Estoque", obrigatorio: true, verificacao: "TEMPERATURA_GELADEIRA:2" },
    { titulo: "Pesar a sobra do blend, guardar na geladeira e etiquetar", categoria: "Produção", obrigatorio: true },
    { titulo: "Nenhum cartão vencido no quadro (descartar o que venceu ou estragou)", categoria: "Estoque", obrigatorio: true, verificacao: "CARTOES_VENCIDOS" },
    { titulo: "Limpar chapa, fritadeira e bancadas e tirar o lixo", categoria: "Higiene", obrigatorio: true },
    { titulo: "Desligar os equipamentos e fechar o gás", categoria: "Equipamentos", obrigatorio: true },
    { titulo: "Descer do freezer a gaveta do dia seguinte para descongelar", categoria: "Produção", obrigatorio: false },
    { titulo: "Conferir o dia: vendas e repasses (Financeiro → Conferência do dia)", categoria: "Financeiro", obrigatorio: false },
  ],
  PRODUCAO: [
    { titulo: "Registrar a temperatura do freezer", categoria: "Estoque", obrigatorio: true, verificacao: "TEMPERATURA_FREEZER:1" },
    { titulo: "Registrar a temperatura da geladeira", categoria: "Estoque", obrigatorio: true, verificacao: "TEMPERATURA_GELADEIRA:1" },
    { titulo: "Nenhum cartão vencido no quadro do estoque", categoria: "Estoque", obrigatorio: true, verificacao: "CARTOES_VENCIDOS" },
    { titulo: "Produzir o blend do lote (pesar, moer e porcionar)", categoria: "Produção", obrigatorio: true },
    { titulo: "Congelar nas gavetas e etiquetar com o lote e a validade", categoria: "Produção", obrigatorio: true },
    { titulo: "Lançar o lote em Produção (rendimento real)", categoria: "Produção", obrigatorio: true },
    { titulo: "Produzir os molhos e as outras preparações", categoria: "Produção", obrigatorio: false },
    { titulo: "Conferir o estoque e repor o que falta (lista de compras)", categoria: "Estoque", obrigatorio: false, verificacao: "ESTOQUE_MINIMO" },
    { titulo: "Higienização geral da cozinha", categoria: "Higiene", obrigatorio: true },
  ],
};

// Que checklists o dia tem: dia de venda (aberto) tem abertura e fechamento; dia
// de produção (segunda e terça fechadas) tem o de produção; outro dia fechado, nenhum.
export function tiposDoDia(horario: Pick<HorarioResolvido, "aberto" | "diaDeProducao">): TipoDeChecklist[] {
  if (horario.aberto) {
    return ["ABERTURA", "FECHAMENTO"];
  }

  return horario.diaDeProducao ? ["PRODUCAO"] : [];
}

// ---------- Itens automáticos ----------

export interface FatosDoDia {
  leiturasDoFreezer: number;
  leiturasDaGeladeira: number;
  cartoesVencidos: { nome: string; local?: string }[];
  abaixoDoMinimo: { nome: string; saldo: number; minimo: number; unidade: string }[];
}

export interface ResultadoAutomatico {
  ok: boolean;
  detalhe: string;
  // Onde resolver quando não está ok
  link?: string;
}

function lista(nomes: string[]): string {
  return nomes.length <= 3 ? nomes.join(", ") : `${nomes.slice(0, 3).join(", ")} e mais ${nomes.length - 3}`;
}

export function avaliarVerificacao(verificacao: string, fatos: FatosDoDia): ResultadoAutomatico {
  const [chave, minimo] = verificacao.split(":");

  const exigidas = Number(minimo ?? 1);

  if (chave === "TEMPERATURA_FREEZER" || chave === "TEMPERATURA_GELADEIRA") {
    const leituras = chave === "TEMPERATURA_FREEZER" ? fatos.leiturasDoFreezer : fatos.leiturasDaGeladeira;

    return leituras >= exigidas
      ? { ok: true, detalhe: `${leituras} leitura(s) registrada(s) hoje.` }
      : {
          ok: false,
          detalhe: `Falta registrar: ${leituras} de ${exigidas} leitura(s) hoje.`,
          link: "/estoque/gavetas",
        };
  }

  if (chave === "CARTOES_VENCIDOS") {
    return fatos.cartoesVencidos.length === 0
      ? { ok: true, detalhe: "Nenhum cartão vencido." }
      : {
          ok: false,
          detalhe: `${fatos.cartoesVencidos.length} cartão(ões) vencido(s): ${lista(fatos.cartoesVencidos.map((cartao) => cartao.nome))}.`,
          link: "/estoque/quadro",
        };
  }

  if (chave === "ESTOQUE_MINIMO") {
    return fatos.abaixoDoMinimo.length === 0
      ? { ok: true, detalhe: "Tudo acima do mínimo." }
      : {
          ok: false,
          detalhe: `${fatos.abaixoDoMinimo.length} item(ns) abaixo do mínimo: ${lista(fatos.abaixoDoMinimo.map((item) => item.nome))}.`,
          link: "/estoque",
        };
  }

  return { ok: false, detalhe: "Verificação automática desconhecida." };
}

// Que temperaturas uma leitura registrou: freezer, geladeira ou as duas. Lê os
// valores estruturados (detalhes) e, nas leituras antigas, o texto do resumo.
export function leituraDeTemperatura(
  resumo: string,
  detalhes?: unknown
): { freezer: boolean; geladeira: boolean } {
  if (detalhes && typeof detalhes === "object" && ("freezer" in detalhes || "geladeira" in detalhes)) {
    const valores = detalhes as { freezer?: unknown; geladeira?: unknown };

    return {
      freezer: typeof valores.freezer === "number",
      geladeira: typeof valores.geladeira === "number",
    };
  }

  return {
    freezer: /freezer\s+-?\d/i.test(resumo),
    geladeira: /geladeira\s+-?\d/i.test(resumo),
  };
}

// ---------- Situação do checklist ----------

export interface ItemDoChecklist {
  id: string;
  titulo: string;
  categoria?: string;
  obrigatorio: boolean;
  verificacao?: string;
  feito: boolean;
  feitoPor?: string;
  feitoEm?: string;
  observacao?: string;
  automatico?: ResultadoAutomatico;
  // Cumprido = marcado à mão OU o sistema verificou que está ok.
  cumprido: boolean;
}

export interface SituacaoDoChecklist {
  total: number;
  cumpridos: number;
  percentual: number;
  // Títulos dos itens obrigatórios ainda não cumpridos
  obrigatoriosPendentes: string[];
  podeConcluir: boolean;
}

export function itemCumprido(item: { feito: boolean; automatico?: ResultadoAutomatico }): boolean {
  return item.feito || item.automatico?.ok === true;
}

export function situacaoDoChecklist(
  itens: Pick<ItemDoChecklist, "titulo" | "obrigatorio" | "cumprido">[]
): SituacaoDoChecklist {
  const cumpridos = itens.filter((item) => item.cumprido).length;

  const obrigatoriosPendentes = itens
    .filter((item) => item.obrigatorio && !item.cumprido)
    .map((item) => item.titulo);

  return {
    total: itens.length,
    cumpridos,
    percentual: itens.length === 0 ? 100 : Math.round((cumpridos / itens.length) * 100),
    obrigatoriosPendentes,
    podeConcluir: obrigatoriosPendentes.length === 0,
  };
}

// ---------- Cadastro dos itens ----------

export function problemaNoItemDoModelo(item: ItemDoModelo): string | null {
  const titulo = item.titulo?.trim();

  if (!titulo) {
    return "Todo item precisa de um título.";
  }

  if (titulo.length > 140) {
    return `O título "${titulo.slice(0, 30)}..." é longo demais (máximo 140 letras).`;
  }

  if (item.verificacao && !CHAVES_VALIDAS.includes(item.verificacao)) {
    return `Verificação automática inválida em "${titulo}".`;
  }

  return null;
}
