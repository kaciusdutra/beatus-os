// O chat da Beatriz no site é público e cada mensagem custa dinheiro de IA. Além do limite por visitante
// (core/seguranca), há um teto de mensagens por dia para a casa toda: passou dele, a Beatriz fica em pausa
// até o dia seguinte e o chat mostra o botão do WhatsApp.
// O contador fica na memória do servidor (vale para um servidor só, como o limite por visitante) e zera
// quando o sistema reinicia: proteja também o gasto pelo limite de uso da conta da IA.

export const TETO_DIARIO_PADRAO = 300;

// Manaus não tem horário de verão: UTC-4 o ano todo.
const DESLOCAMENTO_DE_MANAUS_MS = -4 * 60 * 60 * 1000;

export function diaDeManaus(agoraMs: number): string {
  return new Date(agoraMs + DESLOCAMENTO_DE_MANAUS_MS).toISOString().slice(0, 10);
}

export function tetoDiarioDaConfiguracao(valor: string | undefined): number {
  const numero = Number(valor);

  return Number.isInteger(numero) && numero >= 0 && valor?.trim() !== "" ? numero : TETO_DIARIO_PADRAO;
}

export class TetoDiarioDeMensagens {
  private dia = "";

  private usadas = 0;

  constructor(
    private readonly teto: number,
    private readonly agora: () => number = () => Date.now()
  ) {}

  // Conta uma mensagem se ainda há folga no dia. Devolve false quando o teto foi atingido.
  registrar(): boolean {
    const hoje = diaDeManaus(this.agora());

    if (hoje !== this.dia) {
      this.dia = hoje;

      this.usadas = 0;
    }

    if (this.usadas >= this.teto) {
      return false;
    }

    this.usadas += 1;

    return true;
  }

  // Devolve uma mensagem que não chegou a custar nada (a IA nem foi chamada).
  devolver(): void {
    if (this.usadas > 0) {
      this.usadas -= 1;
    }
  }

  get usadasHoje(): number {
    return diaDeManaus(this.agora()) === this.dia ? this.usadas : 0;
  }
}
