import { ChecklistItem } from "../types/checklist";

const checklist: ChecklistItem[] = [
  {
    id: "temperatura-freezer",
    titulo: "Conferir temperatura do freezer",
    categoria: "Estrutura",
    prioridade: "alta",
    status: "pendente",
    obrigatorio: true,
  },
  {
    id: "estoque-paes",
    titulo: "Conferir estoque de pães",
    categoria: "Estoque",
    prioridade: "alta",
    status: "pendente",
    obrigatorio: true,
  },
  {
    id: "molho-especial",
    titulo: "Produzir molho especial",
    categoria: "Produção",
    prioridade: "media",
    status: "pendente",
    obrigatorio: true,
  },
];

export function obterChecklist(): ChecklistItem[] {
  return [...checklist];
}

export function obterItensPendentes(): ChecklistItem[] {
  return checklist.filter(
    (item) => item.status !== "concluido"
  );
}

export function todosObrigatoriosConcluidos(): boolean {
  const obrigatorios = checklist.filter(
    (item) => item.obrigatorio
  );

  return obrigatorios.every(
    (item) => item.status === "concluido"
  );
}

export function concluirChecklistItem(
  id: string
): void {
  const item = checklist.find(
    (item) => item.id === id
  );

  if (!item) {
    return;
  }

  item.status = "concluido";
}

export function reabrirChecklistItem(
  id: string
): void {
  const item = checklist.find(
    (item) => item.id === id
  );

  if (!item) {
    return;
  }

  item.status = "pendente";
}

export function obterPercentualChecklist(): number {
  if (checklist.length === 0) {
    return 100;
  }

  const concluidos = checklist.filter(
    (item) => item.status === "concluido"
  ).length;

  return Math.round(
    (concluidos / checklist.length) * 100
  );
}