import type {
  ConfiguracaoDeHorarios,
  ExcecaoDeHorario,
  HorarioSemanal,
} from "../services/horarios";

// Porta de persistência dos horários. O serviço só conhece esta interface; o
// Prisma fica na implementação em ./postgres.
export interface HorarioRepositoryPort {
  // Sem linha para um dia da semana, o dia vem do padrão do sistema.
  carregar(): Promise<ConfiguracaoDeHorarios>;

  salvarSemana(semanal: HorarioSemanal): Promise<void>;

  criarExcecao(excecao: Omit<ExcecaoDeHorario, "id">): Promise<ExcecaoDeHorario>;

  removerExcecao(id: string): Promise<ExcecaoDeHorario | null>;
}
