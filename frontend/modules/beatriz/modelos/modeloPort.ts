import type { MensagemDaConversa, UsoDoModelo } from "../types/beatriz";

// O que a Beatriz precisa de um modelo de linguagem. O resto do sistema não
// sabe qual é: hoje a Anthropic, e nos testes um modelo de mentira.
export interface ModeloDeLinguagemPort {
  responder(dados: {
    sistema: string;
    mensagens: MensagemDaConversa[];
  }): Promise<{ texto: string; modelo: string; uso: UsoDoModelo }>;
}

export class ErroDaBeatriz extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
    readonly codigo:
      | "NAO_CONFIGURADA"
      | "CHAVE_RECUSADA"
      | "LIMITE"
      | "INDISPONIVEL"
      | "RECUSADA"
      | "CONVERSA_INVALIDA"
  ) {
    super(mensagem);

    this.name = "ErroDaBeatriz";
  }
}
