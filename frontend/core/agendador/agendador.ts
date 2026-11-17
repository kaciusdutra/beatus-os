// Agendador do servidor: roda tarefas de tempos em tempos enquanto o sistema está no ar, sem depender de
// ninguém ter uma tela aberta (os avisos do WhatsApp, a consulta ao iFood). Regra pura: quem liga as tarefas
// ao resto do sistema é o lib/agendadorDoServidor.ts.
//
// Garantias: uma tarefa nunca roda em cima dela mesma (se a anterior ainda não terminou, pula a vez), um erro
// nunca derruba o servidor nem para o agendador, e os temporizadores não seguram o processo aberto.

export interface TarefaAgendada {
  nome: string;
  intervaloMs: number;
  // Espera antes da primeira execução, para o servidor terminar de subir (padrão: o próprio intervalo).
  atrasoInicialMs?: number;
  executar: () => Promise<unknown>;
}

export type ResultadoDaExecucao = "executada" | "ocupada" | "falhou" | "inexistente";

// Erro repetido (banco fora do ar, por exemplo) aparece no log na primeira vez e depois de tantas falhas seguidas.
const REGISTRAR_A_CADA_N_FALHAS = 20;

export class Agendador {
  private readonly emExecucao = new Set<string>();

  private readonly falhasSeguidas = new Map<string, number>();

  private temporizadores: ReturnType<typeof setTimeout>[] = [];

  private intervalos: ReturnType<typeof setInterval>[] = [];

  constructor(
    private readonly tarefas: TarefaAgendada[],
    private readonly registrarErro: (mensagem: string, erro: unknown) => void = (mensagem, erro) => console.error(mensagem, erro)
  ) {}

  async executar(nome: string): Promise<ResultadoDaExecucao> {
    const tarefa = this.tarefas.find((candidata) => candidata.nome === nome);

    if (!tarefa) {
      return "inexistente";
    }

    if (this.emExecucao.has(nome)) {
      return "ocupada";
    }

    this.emExecucao.add(nome);

    try {
      await tarefa.executar();

      this.falhasSeguidas.set(nome, 0);

      return "executada";
    } catch (erro) {
      const seguidas = (this.falhasSeguidas.get(nome) ?? 0) + 1;

      this.falhasSeguidas.set(nome, seguidas);

      if (seguidas === 1 || seguidas % REGISTRAR_A_CADA_N_FALHAS === 0) {
        this.registrarErro(`AGENDADOR: a tarefa "${nome}" falhou (${seguidas}ª vez seguida):`, erro);
      }

      return "falhou";
    } finally {
      this.emExecucao.delete(nome);
    }
  }

  iniciar(): void {
    if (this.temporizadores.length > 0 || this.intervalos.length > 0) {
      return;
    }

    for (const tarefa of this.tarefas) {
      const comecar = setTimeout(() => {
        void this.executar(tarefa.nome);

        const repetir = setInterval(() => void this.executar(tarefa.nome), tarefa.intervaloMs);

        repetir.unref();

        this.intervalos.push(repetir);
      }, tarefa.atrasoInicialMs ?? tarefa.intervaloMs);

      comecar.unref();

      this.temporizadores.push(comecar);
    }
  }

  parar(): void {
    for (const temporizador of this.temporizadores) {
      clearTimeout(temporizador);
    }

    for (const intervalo of this.intervalos) {
      clearInterval(intervalo);
    }

    this.temporizadores = [];

    this.intervalos = [];
  }
}
