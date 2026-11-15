// "Ajustes para amanhã": o que se percebeu no dia de trabalho e facilita o dia
// seguinte (repor, produzir mais, descongelar antes, item acabando). Ficam no
// Registro de atividades (só se acrescenta): um registro cria o ajuste e outro,
// depois, o resolve. Não há tabela nova: o estado é calculado destes registros.

export const ACAO_AJUSTE = "AJUSTE_DO_DIA";

export const ACAO_AJUSTE_RESOLVIDO = "AJUSTE_RESOLVIDO";

export const TAMANHO_MAXIMO_DO_AJUSTE = 200;

export interface LinhaDeAjuste {
  id: string;
  acao: string;
  referenciaId?: string;
  operador?: string;
  criadoEm: string;
  detalhes?: unknown;
}

export interface AjusteDoDia {
  id: string;
  texto: string;
  // Item do estoque a que o ajuste se refere (opcional).
  itemTipo?: string;
  itemId?: string;
  itemNome?: string;
  criadoEm: string;
  criadoPor?: string;
  resolvidoEm?: string;
  resolvidoPor?: string;
}

export function problemaNoTextoDoAjuste(texto: string): string | null {
  const limpo = texto.trim();

  if (!limpo) {
    return "Escreva o que precisa ser feito amanhã.";
  }

  if (limpo.length > TAMANHO_MAXIMO_DO_AJUSTE) {
    return `O ajuste pode ter até ${TAMANHO_MAXIMO_DO_AJUSTE} letras.`;
  }

  return null;
}

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
}

// Junta os registros de criação e de resolução. Do mais novo para o mais antigo.
export function consolidarAjustes(linhas: LinhaDeAjuste[]): AjusteDoDia[] {
  const resolucoes = new Map<string, LinhaDeAjuste>();

  for (const linha of linhas) {
    if (linha.acao === ACAO_AJUSTE_RESOLVIDO && linha.referenciaId) {
      const anterior = resolucoes.get(linha.referenciaId);

      // Vale a primeira resolução.
      if (!anterior || linha.criadoEm < anterior.criadoEm) {
        resolucoes.set(linha.referenciaId, linha);
      }
    }
  }

  return linhas
    .filter((linha) => linha.acao === ACAO_AJUSTE)
    .map((linha): AjusteDoDia => {
      const detalhes = (linha.detalhes ?? {}) as Record<string, unknown>;

      const resolucao = resolucoes.get(linha.id);

      return {
        id: linha.id,
        texto: texto(detalhes.texto) ?? "(sem texto)",
        itemTipo: texto(detalhes.itemTipo),
        itemId: texto(detalhes.itemId),
        itemNome: texto(detalhes.itemNome),
        criadoEm: linha.criadoEm,
        criadoPor: linha.operador,
        resolvidoEm: resolucao?.criadoEm,
        resolvidoPor: resolucao?.operador,
      };
    })
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export function ajustesPendentes(ajustes: AjusteDoDia[]): AjusteDoDia[] {
  return ajustes.filter((ajuste) => !ajuste.resolvidoEm);
}
