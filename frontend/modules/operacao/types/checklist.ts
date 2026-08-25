export type Prioridade = "baixa" | "media" | "alta";

export type StatusChecklist =
  | "pendente"
  | "em_andamento"
  | "concluido";

export interface ChecklistItem {
  id: string;
  titulo: string;
  categoria: string;
  prioridade: Prioridade;
  obrigatorio: boolean;
  status: StatusChecklist;
  observacoes?: string;
  responsavel?: string;
}