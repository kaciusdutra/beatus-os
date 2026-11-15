import type { CanalPedido } from "@/modules/pedidos/types/pedido";

import { ErroDaBeatriz, type ModeloDeLinguagemPort } from "../modelos/modeloPort";

import type { CardapioParaIAPort } from "../repositories/cardapioParaIAPort";

import type {
  MensagemDaConversa,
  RascunhoDePedido,
  RespostaDaBeatriz,
  UsoDoModelo,
} from "../types/beatriz";

import { cardapioEmTexto } from "./cardapioParaIA";

import { montarInstrucoes } from "./instrucoesDaBeatriz";

import { interpretarRespostaDaBeatriz } from "./interpretarRespostaDaBeatriz";

const CANAIS_DA_BEATRIZ: CanalPedido[] = ["WHATSAPP", "CARDAPIO_ONLINE", "PDV"];

// Só as últimas mensagens e com tamanho limitado: segura o custo e o abuso.
const MENSAGENS_MAXIMAS = 20;

const TAMANHO_MAXIMO_DA_MENSAGEM = 1000;

export interface RespostaComUso extends RespostaDaBeatriz {
  modelo: string;
  uso: UsoDoModelo;
}

// Beatriz, atendente por conversa. Ela entende o cliente e anota o pedido, mas
// quem decide preço, total e o que existe é o sistema: cada item que ela anota é
// conferido com o cardápio, os valores são calculados aqui e a decisão final de
// lançar o pedido continua com uma pessoa (modo assistido).
export class BeatrizService {
  constructor(
    private readonly cardapio: CardapioParaIAPort,
    private readonly modelo: ModeloDeLinguagemPort
  ) {}

  async responder(entrada: {
    mensagens: MensagemDaConversa[];
    canal?: CanalPedido;
    // O rascunho da resposta anterior, para a conversa não perder o pedido.
    rascunhoAtual?: RascunhoDePedido;
  }): Promise<RespostaComUso> {
    const canal = entrada.canal ?? "WHATSAPP";

    if (!CANAIS_DA_BEATRIZ.includes(canal)) {
      throw new ErroDaBeatriz("A Beatriz atende os canais próprios (WhatsApp e cardápio online).", 422, "CONVERSA_INVALIDA");
    }

    const mensagens = (Array.isArray(entrada.mensagens) ? entrada.mensagens : [])
      .filter(
        (mensagem) =>
          (mensagem?.papel === "cliente" || mensagem?.papel === "beatriz") &&
          typeof mensagem.texto === "string" &&
          mensagem.texto.trim() !== ""
      )
      .map((mensagem) => ({
        papel: mensagem.papel,
        texto: mensagem.texto.trim().slice(0, TAMANHO_MAXIMO_DA_MENSAGEM),
      }))
      .slice(-MENSAGENS_MAXIMAS);

    if (mensagens.length === 0 || mensagens[mensagens.length - 1].papel !== "cliente") {
      throw new ErroDaBeatriz("A conversa precisa terminar com uma mensagem do cliente.", 422, "CONVERSA_INVALIDA");
    }

    const itensDoCardapio = await this.cardapio.carregar(canal);

    if (itensDoCardapio.length === 0) {
      throw new ErroDaBeatriz(
        "O cardápio está sem produtos com preço neste canal. Defina os preços em Financeiro → Precificação.",
        422,
        "CONVERSA_INVALIDA"
      );
    }

    const sistema = montarInstrucoes(cardapioEmTexto(itensDoCardapio), entrada.rascunhoAtual);

    const { texto, modelo, uso } = await this.modelo.responder({ sistema, mensagens });

    return {
      ...interpretarRespostaDaBeatriz(texto, itensDoCardapio),
      modelo,
      uso,
    };
  }
}
