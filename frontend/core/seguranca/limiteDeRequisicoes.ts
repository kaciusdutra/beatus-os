// Limite de pedidos por visitante para as rotas públicas (o site não tem login,
// então qualquer um pode chamar). Janela fixa, em memória: vale para um servidor
// só (o caso do Beatus). Com mais de um servidor, o limite passa a ser por servidor.

export interface ResultadoDoLimite {
  permitido: boolean;
  // Quanto falta, em segundos, para a janela atual acabar.
  esperarSegundos: number;
}

export class LimiteDeRequisicoes {
  private readonly contagens = new Map<string, { inicio: number; total: number }>();

  constructor(
    private readonly maximo: number,
    private readonly janelaEmMs: number,
    private readonly agora: () => number = () => Date.now()
  ) {}

  permitir(chave: string): ResultadoDoLimite {
    const agora = this.agora();

    this.limparSeCrescer(agora);

    const atual = this.contagens.get(chave);

    if (!atual || agora - atual.inicio >= this.janelaEmMs) {
      this.contagens.set(chave, { inicio: agora, total: 1 });

      return { permitido: true, esperarSegundos: 0 };
    }

    atual.total += 1;

    if (atual.total > this.maximo) {
      return { permitido: false, esperarSegundos: Math.max(1, Math.ceil((atual.inicio + this.janelaEmMs - agora) / 1000)) };
    }

    return { permitido: true, esperarSegundos: 0 };
  }

  // Para a memória não crescer com visitantes que nunca voltam.
  private limparSeCrescer(agora: number): void {
    if (this.contagens.size < 5000) {
      return;
    }

    for (const [chave, valor] of this.contagens) {
      if (agora - valor.inicio >= this.janelaEmMs) {
        this.contagens.delete(chave);
      }
    }
  }
}

// O visitante, pelo endereço. Atrás de um proxy de hospedagem vale o primeiro da lista encaminhada.
export function chaveDoVisitante(cabecalhos: Headers): string {
  const encaminhado = cabecalhos.get("x-forwarded-for")?.split(",")[0].trim();

  return encaminhado || cabecalhos.get("x-real-ip") || "desconhecido";
}
