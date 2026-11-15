import type { EstadoDoChecklist } from "./checklistDoDiaService";

// Cópia, no navegador, do estado do checklist de hoje. A fonte de verdade é o
// banco (Operação → Checklist); aqui só se guarda se o de abertura já foi
// concluído, para o estado da operação (Checklist, Operando...) e o Dashboard.
// A cópia chega ao abrir o sistema e a cada minuto.
let estado: EstadoDoChecklist | null = null;

export function definirEstadoDoChecklist(novo: EstadoDoChecklist | null): void {
  estado = novo;
}

// Busca o estado gravado. Falha de rede não derruba nada: continua valendo a
// última cópia que se tinha.
export async function carregarChecklistDoServidor(): Promise<void> {
  try {
    const resposta = await fetch("/api/operacao/checklist/estado", { cache: "no-store" });

    const dados = await resposta.json();

    if (resposta.ok && dados.sucesso && dados.estado) {
      definirEstadoDoChecklist(dados.estado as EstadoDoChecklist);
    }
  } catch {
    // sem rede: mantém a cópia atual
  }
}

// O checklist de abertura de hoje está concluído? Dia sem abertura (fechado ou de
// produção) não tem o que concluir. Antes de a cópia chegar, vale "não concluído".
export function todosObrigatoriosConcluidos(): boolean {
  if (!estado) {
    return false;
  }

  return !estado.temAbertura || estado.aberturaConcluida;
}
