import type { ItemDoModelo, TipoDeChecklist } from "../services/checklist";

export interface ItemDoModeloSalvo extends ItemDoModelo {
  id: string;
}

export interface ItemDaExecucaoSalvo {
  id: string;
  titulo: string;
  categoria?: string;
  obrigatorio: boolean;
  ordem: number;
  verificacao?: string;
  feito: boolean;
  feitoPor?: string;
  feitoEm?: string;
  observacao?: string;
}

export interface ExecucaoSalva {
  id: string;
  // AAAA-MM-DD
  data: string;
  tipo: TipoDeChecklist;
  concluidoEm?: string;
  concluidoPor?: string;
  itens: ItemDaExecucaoSalvo[];
}

// Porta de persistência do checklist. O serviço só conhece esta interface; o
// Prisma fica na implementação em ./postgres.
export interface ChecklistRepositoryPort {
  listarModelo(tipo: TipoDeChecklist): Promise<ItemDoModeloSalvo[]>;

  // Grava a lista inicial só se a empresa ainda não tem nenhum item cadastrado.
  semearModeloSeVazio(padrao: Record<TipoDeChecklist, ItemDoModelo[]>): Promise<void>;

  // Troca todos os itens do tipo pelos informados, na ordem dada. O histórico
  // (execuções) não é tocado.
  substituirModelo(tipo: TipoDeChecklist, itens: ItemDoModelo[]): Promise<void>;

  buscarExecucao(data: string, tipo: TipoDeChecklist): Promise<ExecucaoSalva | null>;

  buscarExecucaoDoItem(itemId: string): Promise<ExecucaoSalva | null>;

  buscarExecucaoPorId(id: string): Promise<ExecucaoSalva | null>;

  // Cria o checklist do dia como cópia dos itens informados; se já existir
  // (corrida entre duas telas), devolve o que existe.
  criarExecucao(data: string, tipo: TipoDeChecklist, itens: ItemDoModelo[]): Promise<ExecucaoSalva>;

  marcarItem(
    itemId: string,
    dados: { feito: boolean; observacao?: string; operador?: string | null }
  ): Promise<void>;

  concluir(execucaoId: string, operador?: string | null): Promise<void>;

  reabrir(execucaoId: string): Promise<void>;

  // Execuções de um dia (para o estado da operação e o Dashboard).
  listarExecucoesDoDia(data: string): Promise<ExecucaoSalva[]>;
}
