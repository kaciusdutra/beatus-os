import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { ErroDaBeatriz, type ModeloDeLinguagemPort } from "./modeloPort";

// A Beatriz fala com a IA da Anthropic. A chave fica só no servidor (.env:
// ANTHROPIC_API_KEY) e nunca é impressa nem enviada ao navegador. O modelo
// padrão é o Sonnet (equilíbrio entre custo e qualidade para conversar); pode
// ser trocado no .env sem mexer no código: BEATRIZ_MODELO ou, se não houver,
// ANTHROPIC_MODELO.
const MODELO_PADRAO = "claude-sonnet-5-5";

const TEMPO_LIMITE_MS = 60_000;

const MAX_TOKENS_SAIDA = 1500;

export function beatrizConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export class ModeloAnthropic implements ModeloDeLinguagemPort {
  async responder(dados: Parameters<ModeloDeLinguagemPort["responder"]>[0]) {
    const chave = process.env.ANTHROPIC_API_KEY?.trim();

    if (!chave) {
      throw new ErroDaBeatriz(
        "A Beatriz ainda não está configurada: coloque a ANTHROPIC_API_KEY no .env do servidor.",
        503,
        "NAO_CONFIGURADA"
      );
    }

    const modelo =
      process.env.BEATRIZ_MODELO?.trim() ||
      process.env.ANTHROPIC_MODELO?.trim() ||
      MODELO_PADRAO;

    const client = new Anthropic({ apiKey: chave, timeout: TEMPO_LIMITE_MS, maxRetries: 2 });

    // A IA exige alternar cliente e Beatriz, começando pelo cliente: junta mensagens
    // seguidas do mesmo lado e descarta o que vier antes da primeira do cliente.
    const mensagens: { role: "user" | "assistant"; content: string }[] = [];

    for (const mensagem of dados.mensagens) {
      const role = mensagem.papel === "cliente" ? "user" : "assistant";

      const ultima = mensagens[mensagens.length - 1];

      if (!ultima && role === "assistant") {
        continue;
      }

      if (ultima && ultima.role === role) {
        ultima.content += `\n${mensagem.texto}`;
      } else {
        mensagens.push({ role, content: mensagem.texto });
      }
    }

    let resposta: Anthropic.Message;

    try {
      resposta = await client.messages.create({
        model: modelo,
        max_tokens: MAX_TOKENS_SAIDA,
        system: dados.sistema,
        output_config: { effort: "low" },
        messages: mensagens,
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new ErroDaBeatriz(
          "A chave da Anthropic foi recusada. Confira o valor de ANTHROPIC_API_KEY no .env.",
          503,
          "CHAVE_RECUSADA"
        );
      }

      if (error instanceof Anthropic.RateLimitError) {
        throw new ErroDaBeatriz("Muitas mensagens em sequência. Espere um minuto e tente de novo.", 429, "LIMITE");
      }

      console.error("ERRO NA BEATRIZ:", error instanceof Error ? error.message : error);

      throw new ErroDaBeatriz(
        "A Beatriz não conseguiu responder agora. Atenda manualmente ou tente de novo.",
        503,
        "INDISPONIVEL"
      );
    }

    if (resposta.stop_reason === "refusal") {
      throw new ErroDaBeatriz("A IA recusou responder a esta mensagem. Atenda manualmente.", 422, "RECUSADA");
    }

    const texto = resposta.content
      .filter((bloco): bloco is Anthropic.TextBlock => bloco.type === "text")
      .map((bloco) => bloco.text)
      .join("\n");

    return {
      texto,
      modelo,
      uso: {
        entrada: resposta.usage.input_tokens,
        saida: resposta.usage.output_tokens,
      },
    };
  }
}
