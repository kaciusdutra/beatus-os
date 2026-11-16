import { mesclarEtiquetas } from "@/core/memoria/etiquetasDoCliente";

import { BeatrizService } from "./beatrizService";

import { favoritosDosPedidos, memoriaEmTexto, ultimoPedidoParaMemoria } from "./memoriaParaIA";

import { interpretarRespostaDaBeatriz } from "./interpretarRespostaDaBeatriz";

import type { ModeloDeLinguagemPort } from "../modelos/modeloPort";

import type { CardapioParaIAPort } from "../repositories/cardapioParaIAPort";

import type { MemoriaDoClientePort } from "../repositories/memoriaDoClientePort";

import type { ItemDoCardapioIA } from "./cardapioParaIA";

import type { MemoriaDoCliente, MensagemDaConversa } from "../types/beatriz";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const CARDAPIO: ItemDoCardapioIA[] = [
  { id: "agnus", nome: "Agnus", descricao: "Brioche, blend 160g", categoria: "HAMBÚRGUER", preco: 44.9, adicional: false },
  { id: "sanctum", nome: "Sanctum", descricao: "Costela e coalho", categoria: "HAMBÚRGUER", preco: 39.9, adicional: false },
];

const agora = new Date("2026-11-16T15:00:00.000Z");

const diasAtras = (dias: number) => new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);

// ---------- Memória que vem dos pedidos ----------

const pedidos = [
  { criadoEm: diasAtras(3), itens: [{ nome: "Agnus", quantidade: 2 }] },
  { criadoEm: diasAtras(10), itens: [{ nome: "Sanctum", quantidade: 1 }, { nome: "Batata Frita", quantidade: 1 }] },
  { criadoEm: diasAtras(20), itens: [{ nome: "Agnus", quantidade: 1 }] },
];

verificar(favoritosDosPedidos(pedidos).join() === "Agnus,Sanctum,Batata Frita", "favoritos: mais pedido primeiro");
verificar(favoritosDosPedidos(pedidos, 1).join() === "Agnus", "respeita o máximo");
verificar(favoritosDosPedidos([]).length === 0, "sem pedido, sem favorito");
verificar(favoritosDosPedidos([{ criadoEm: diasAtras(1), itens: [{ nome: "A", quantidade: 1 }, { nome: "B", quantidade: 1 }] }]).join() === "A,B", "empate: o primeiro da lista");

{
  const ultimo = ultimoPedidoParaMemoria(pedidos, agora);

  verificar(ultimo?.diasAtras === 3 && ultimo.itens[0].nome === "Agnus" && ultimo.itens[0].quantidade === 2, "último pedido e há quantos dias");
  verificar(ultimoPedidoParaMemoria([], agora) === undefined && ultimoPedidoParaMemoria([{ criadoEm: agora, itens: [] }], agora) === undefined, "sem pedido ou sem itens: nada");
}

// ---------- Memória em texto para a IA ----------

const conhecido: MemoriaDoCliente = {
  conhecido: true,
  nome: "Gabriel",
  etiquetas: ["apelido:biel", "evita:cebola"],
  aceitaClube: true,
  quantidadeDePedidos: 5,
  ultimoPedido: { itens: [{ nome: "Agnus", quantidade: 2 }], diasAtras: 3 },
  favoritos: ["Agnus", "Sanctum"],
};

{
  const texto = memoriaEmTexto(conhecido);

  verificar(texto.includes("Gabriel") && texto.includes("há 3 dias") && texto.includes("2× Agnus") && texto.includes("#") === false && texto.includes("apelido:biel") && texto.includes("sim"), "o texto leva nome, último pedido, favoritos, etiquetas e o clube");
  verificar(memoriaEmTexto(undefined) === "", "sem memória, texto vazio");
  verificar(memoriaEmTexto({ ...conhecido, ultimoPedido: { itens: [{ nome: "Agnus", quantidade: 1 }], diasAtras: 0 } }).includes("hoje"), "pedido de hoje");
  verificar(memoriaEmTexto({ ...conhecido, ultimoPedido: { itens: [{ nome: "Agnus", quantidade: 1 }], diasAtras: 1 } }).includes("ontem"), "pedido de ontem");
  verificar(memoriaEmTexto({ ...conhecido, aceitaClube: false }).includes("clube de vantagens: não"), "quem não aceitou o clube aparece como não");
}

// ---------- A resposta da IA traz as etiquetas, já limpas ----------

{
  const bruto = JSON.stringify({
    intencao: "DUVIDA",
    resposta: "Fechou, anotei!",
    itens: [],
    cliente: {},
    pendencias: [],
    pedidoConfirmadoPeloCliente: false,
    precisaDeHumano: false,
    resumoParaOperador: "Conversa.",
    etiquetas: { adicionar: ["Gosto: Agnus", "alergia:camarão", "ponto:bem-passado"], remover: ["evita:cebola"] },
  });

  const resposta = interpretarRespostaDaBeatriz(bruto, CARDAPIO);

  verificar(resposta.etiquetas.adicionar.join() === "gosto:agnus,ponto:bem-passado", "etiquetas da IA limpas e sem saúde");
  verificar(resposta.etiquetas.recusadas.length === 1 && resposta.etiquetas.remover.join() === "evita:cebola", "recusada contada e remoção mantida");

  const semCampo = interpretarRespostaDaBeatriz(JSON.stringify({ intencao: "DUVIDA", resposta: "Oi!", itens: [] }), CARDAPIO);

  verificar(semCampo.etiquetas.adicionar.length === 0 && semCampo.etiquetas.remover.length === 0, "IA que não manda etiquetas não aprende nada");

  const ilegivel = interpretarRespostaDaBeatriz("isto não é json", CARDAPIO);

  verificar(ilegivel.etiquetas.adicionar.length === 0 && ilegivel.precisaDeHumano, "resposta ilegível não grava memória");
}

// ---------- O serviço: identifica, lembra e aprende ----------

class ModeloFalso implements ModeloDeLinguagemPort {
  chamadas: { sistema: string; mensagens: MensagemDaConversa[] }[] = [];

  constructor(private readonly resposta: object) {}

  async responder(dados: { sistema: string; mensagens: MensagemDaConversa[] }) {
    this.chamadas.push(dados);

    return { texto: JSON.stringify(this.resposta), modelo: "modelo-falso", uso: { entrada: 10, saida: 5 } };
  }
}

class MemoriaFalsa implements MemoriaDoClientePort {
  carregadas: string[] = [];

  gravadas: { telefone: string; adicionar: string[]; remover: string[] }[] = [];

  constructor(private memoria: MemoriaDoCliente) {}

  async carregar(telefone: string) {
    this.carregadas.push(telefone);

    return this.memoria;
  }

  async gravar(telefone: string, mudanca: { adicionar: string[]; remover: string[] }) {
    this.gravadas.push({ telefone, ...mudanca });

    this.memoria = { ...this.memoria, etiquetas: mesclarEtiquetas(this.memoria.etiquetas, mudanca) };

    return this.memoria.etiquetas;
  }
}

const cardapio: CardapioParaIAPort = { carregar: async () => CARDAPIO };

const conversa: MensagemDaConversa[] = [{ papel: "cliente", texto: "oi, sou eu de novo, pode ser o de sempre mas sem cebola" }];

const respostaDaIA = {
  intencao: "PEDIDO",
  resposta: "Fala, Biel! Bora de Agnus de novo?",
  itens: [{ produtoId: "agnus", quantidade: 1, observacao: "sem cebola", adicionais: [] }],
  cliente: { nome: "Gabriel" },
  pendencias: ["ENDERECO", "CONFIRMACAO"],
  pedidoConfirmadoPeloCliente: false,
  precisaDeHumano: false,
  resumoParaOperador: "Cliente de volta, quer o de sempre.",
  etiquetas: { adicionar: ["gosto:agnus", "evita:cebola"], remover: [] },
};

async function executarTestes(): Promise<void> {
  // Telefone confirmado: carrega a memória, entrega à IA e grava o que aprendeu
  {
    const modelo = new ModeloFalso(respostaDaIA);

    const memoria = new MemoriaFalsa({ ...conhecido, etiquetas: ["apelido:biel"] });

    const servico = new BeatrizService(cardapio, modelo, memoria);

    const resposta = await servico.responder({ mensagens: conversa, canal: "WHATSAPP", telefoneIdentificado: "5592988880001" });

    verificar(memoria.carregadas.join() === "92988880001", "carrega a memória pelo telefone do cadastro (sem o 55)");
    verificar(modelo.chamadas[0].sistema.includes("Último pedido (há 3 dias): 2× Agnus") && modelo.chamadas[0].sistema.includes("apelido:biel"), "a IA recebe o que sabe do cliente");
    verificar(memoria.gravadas.length === 1 && memoria.gravadas[0].adicionar.join() === "gosto:agnus,evita:cebola", "grava o que aprendeu");
    verificar(resposta.memoria?.etiquetas.join() === "apelido:biel,gosto:agnus,evita:cebola", "devolve as etiquetas que ficaram");
    verificar(resposta.rascunho.itens[0].precoUnitario === 44.9, "o preço continua sendo do cardápio");
  }

  // Sem telefone confirmado: não abre nem grava memória
  {
    const modelo = new ModeloFalso(respostaDaIA);

    const memoria = new MemoriaFalsa(conhecido);

    const resposta = await new BeatrizService(cardapio, modelo, memoria).responder({ mensagens: conversa, canal: "CARDAPIO_ONLINE" });

    verificar(memoria.carregadas.length === 0 && memoria.gravadas.length === 0, "sem identificação confirmada não toca na memória");
    verificar(modelo.chamadas[0].sistema.includes("primeira conversa") && !modelo.chamadas[0].sistema.includes("Gabriel"), "a IA atende como primeira conversa e não recebe dado de ninguém");
    verificar(resposta.memoria === undefined, "e nada de memória na resposta");
  }

  // Telefone inválido: igual a não identificado
  {
    const memoria = new MemoriaFalsa(conhecido);

    await new BeatrizService(cardapio, new ModeloFalso(respostaDaIA), memoria).responder({ mensagens: conversa, telefoneIdentificado: "123" });

    verificar(memoria.carregadas.length === 0, "telefone inválido não carrega memória");
  }

  // Sem a memória configurada, a Beatriz funciona como antes
  {
    const resposta = await new BeatrizService(cardapio, new ModeloFalso(respostaDaIA)).responder({ mensagens: conversa, telefoneIdentificado: "92988880001" });

    verificar(resposta.rascunho.itens.length === 1 && resposta.memoria === undefined, "sem a porta da memória, atende normalmente");
  }

  // Nada aprendido: não grava
  {
    const memoria = new MemoriaFalsa(conhecido);

    await new BeatrizService(cardapio, new ModeloFalso({ ...respostaDaIA, etiquetas: { adicionar: [], remover: [] } }), memoria).responder({ mensagens: conversa, telefoneIdentificado: "92988880001" });

    verificar(memoria.carregadas.length === 1 && memoria.gravadas.length === 0, "sem novidade, não grava");
  }

  // Dado de saúde que a IA tentou guardar: o sistema recusa
  {
    const memoria = new MemoriaFalsa({ ...conhecido, etiquetas: [] });

    const resposta = await new BeatrizService(cardapio, new ModeloFalso({ ...respostaDaIA, etiquetas: { adicionar: ["alergia:amendoim", "gosto:sanctum"], remover: [] } }), memoria).responder({ mensagens: conversa, telefoneIdentificado: "92988880001" });

    verificar(memoria.gravadas[0].adicionar.join() === "gosto:sanctum" && resposta.etiquetas.recusadas.length === 1, "etiqueta de saúde nunca chega ao banco");
  }

  // As instruções ensinam a Beatriz a ser gente e a respeitar o clube
  {
    const modelo = new ModeloFalso(respostaDaIA);

    await new BeatrizService(cardapio, modelo, new MemoriaFalsa(conhecido)).responder({ mensagens: conversa, telefoneIdentificado: "92988880001" });

    const sistema = modelo.chamadas[0].sistema;

    verificar(sistema.includes("vai no de sempre") && sistema.includes("experimentar outro sabor"), "ela puxa o último pedido e oferece experimentar outro sabor");
    verificar(sistema.includes("NÃO prometa desconto, brinde, ponto, nível, prazo"), "não promete benefício que o sistema não tem");
    verificar(sistema.includes("só fale dele se o cliente aceitou participar"), "clube só para quem aceitou");
    verificar(sistema.includes("etiquetas.adicionar") && sistema.includes("NUNCA guarde"), "ensina a aprender e o que nunca guardar");
    verificar(sistema.includes("Nada de tom de robô"), "tom humano");
  }
}

executarTestes()
  .then(() => {
    console.log(`✅ Testes da memória da Beatriz passaram (${verificacoes} verificações).`);
  })
  .catch((erro) => {
    console.error(erro);

    process.exitCode = 1;
  });
