import type { CanalPedido } from "@/modules/pedidos/types/pedido";

import { ErroDaBeatriz, type ModeloDeLinguagemPort } from "../modelos/modeloPort";

import type { CardapioParaIAPort } from "../repositories/cardapioParaIAPort";

import type { MemoriaDoClientePort } from "../repositories/memoriaDoClientePort";

import type {
  MemoriaDoCliente,
  MensagemDaConversa,
  RascunhoDePedido,
  RespostaDaBeatriz,
  UsoDoModelo,
} from "../types/beatriz";

import { cardapioEmTexto } from "./cardapioParaIA";

import { telefoneDoCadastro } from "@/core/memoria/etiquetasDoCliente";

import { montarInstrucoes } from "./instrucoesDaBeatriz";

import { memoriaEmTexto } from "./memoriaParaIA";

import { montarRascunho } from "./interpretarRespostaDaBeatriz";

import { interpretarRespostaDaBeatriz } from "./interpretarRespostaDaBeatriz";

const CANAIS_DA_BEATRIZ: CanalPedido[] = ["WHATSAPP", "CARDAPIO_ONLINE", "PDV"];

// Só as últimas mensagens e com tamanho limitado: segura o custo e o abuso.
const MENSAGENS_MAXIMAS = 20;

const TAMANHO_MAXIMO_DA_MENSAGEM = 1000;

// O rascunho que vem de fora não é confiável nem no tamanho: sem teto, alguém mandaria milhares de linhas só para gastar o servidor.
export const ITENS_MAXIMOS_DO_RASCUNHO = 30;

export const ADICIONAIS_MAXIMOS_POR_ITEM = 10;

export interface RespostaComUso extends RespostaDaBeatriz {
  modelo: string;
  uso: UsoDoModelo;
  // O que ela sabia do cliente nesta conversa e as etiquetas que ficaram depois dela (só com telefone identificado).
  memoria?: MemoriaDoCliente;
}

// Beatriz, atendente por conversa. Ela entende o cliente e anota o pedido, mas
// quem decide preço, total e o que existe é o sistema: cada item que ela anota é
// conferido com o cardápio, os valores são calculados aqui e a decisão final de
// lançar o pedido continua com uma pessoa (modo assistido).
export class BeatrizService {
  constructor(
    private readonly cardapio: CardapioParaIAPort,
    private readonly modelo: ModeloDeLinguagemPort,
    // Sem a memória, a Beatriz atende todo mundo como se fosse a primeira conversa.
    private readonly memoria?: MemoriaDoClientePort
  ) {}

  async responder(entrada: {
    mensagens: MensagemDaConversa[];
    canal?: CanalPedido;
    // O rascunho da resposta anterior, para a conversa não perder o pedido.
    rascunhoAtual?: RascunhoDePedido;
    // O telefone de quem fala, JÁ CONFIRMADO pelo canal (o número do WhatsApp, ou o código enviado pelo WhatsApp
    // no site). Sem ele a Beatriz não abre nem grava memória: digitar o telefone de outra pessoa não pode revelar nada.
    telefoneIdentificado?: string;
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

    const telefone = this.memoria ? telefoneDoCadastro(entrada.telefoneIdentificado) : undefined;

    const conhecimento = telefone ? await this.memoria?.carregar(telefone) : undefined;

    // O rascunho que vem de fora (a tela, o navegador do cliente) não é confiável: só entram os produtos e as
    // quantidades, e nome, preço e adicionais saem de novo do cardápio. Nada escrito pelo chamador vai para a IA.
    const rascunhoConferido = Array.isArray(entrada.rascunhoAtual?.itens)
      ? montarRascunho(
          entrada.rascunhoAtual?.itens.slice(0, ITENS_MAXIMOS_DO_RASCUNHO).map((item) => ({
            produtoId: item?.produtoId,
            quantidade: item?.quantidade,
            observacao: item?.observacao,
            adicionais: Array.isArray(item?.adicionais) ? item.adicionais.slice(0, ADICIONAIS_MAXIMOS_POR_ITEM).map((adicional) => ({ produtoId: adicional?.produtoId, quantidade: adicional?.quantidade })) : [],
          })),
          itensDoCardapio
        ).rascunho
      : undefined;

    const sistema = montarInstrucoes(cardapioEmTexto(itensDoCardapio), rascunhoConferido, memoriaEmTexto(conhecimento));

    const { texto, modelo, uso } = await this.modelo.responder({ sistema, mensagens });

    const resposta = interpretarRespostaDaBeatriz(texto, itensDoCardapio);

    // O que ela aprendeu vira etiquetas no cadastro (ou no contato, se a pessoa ainda não é cliente).
    let memoria = conhecimento;

    const { adicionar, remover } = resposta.etiquetas;

    if (telefone && conhecimento && (adicionar.length > 0 || remover.length > 0)) {
      memoria = { ...conhecimento, etiquetas: await this.memoria!.gravar(telefone, { adicionar, remover }) };
    }

    return {
      ...resposta,
      modelo,
      uso,
      memoria,
    };
  }
}
