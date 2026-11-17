import type { ItemDoCardapioIA } from "./cardapioParaIA";

import {
  extrairJson,
  interpretarRespostaDaBeatriz,
  montarRascunho,
  removerValoresDoTexto,
  resumoDoPedido,
} from "./interpretarRespostaDaBeatriz";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const CARDAPIO: ItemDoCardapioIA[] = [
  { id: "sanctum", nome: "Sanctum", descricao: "Pão brioche e blend 160g", categoria: "HAMBÚRGUER", preco: 50, adicional: false },
  { id: "agnus", nome: "Agnus", descricao: "", categoria: "HAMBÚRGUER", preco: 40, adicional: false },
  { id: "batata", nome: "Batata Frita", descricao: "", categoria: "ACOMPANHAMENTO", preco: 15, adicional: false },
  { id: "bacon", nome: "Bacon extra", descricao: "", categoria: "ADICIONAL", preco: 6.5, adicional: true },
];

function json(objeto: unknown): string {
  return JSON.stringify(objeto);
}

function executarTestes(): void {
  // ---------- JSON ----------
  verificar((extrairJson('```json\n{"a":1}\n```') as { a: number }).a === 1, "tira a cerca de código");
  verificar((extrairJson('Claro! {"a":2} pronto') as { a: number }).a === 2, "pega o JSON no meio do texto");

  let semJson = false;

  try {
    extrairJson("sem chaves");
  } catch {
    semJson = true;
  }

  verificar(semJson, "texto sem JSON dá erro");

  // ---------- Valores no texto ----------
  verificar(
    removerValoresDoTexto("Anotei seu pedido! O total fica R$ 90,00. Qual o endereço?") === "Anotei seu pedido! Qual o endereço?",
    "tira a frase com valor"
  );
  verificar(removerValoresDoTexto("Sai por 25 reais, ok?") === "", "tira a frase com 'reais'");
  verificar(removerValoresDoTexto("Fica 12,50 no total.") === "", "tira a frase com decimal");
  verificar(removerValoresDoTexto("Quer batata junto? Temos 2 tamanhos de lanche.") === "Quer batata junto? Temos 2 tamanhos de lanche.", "número sem valor fica");

  // ---------- Rascunho: preço do cardápio, não da IA ----------
  const { rascunho, avisos } = montarRascunho(
    [
      { produtoId: "sanctum", quantidade: 2, preco: 1, observacao: "sem cebola", adicionais: [{ produtoId: "bacon", quantidade: 1 }] },
      { produtoId: "batata", quantidade: 1 },
    ],
    CARDAPIO
  );

  verificar(avisos.length === 0, "tudo válido, sem avisos");
  verificar(rascunho.itens[0].precoUnitario === 50, "preço vem do cardápio (a IA mandou 1)");
  verificar(rascunho.itens[0].subtotal === 106.5, "2 × 50 + 1 bacon de 6,50");
  verificar(rascunho.subtotal === 121.5, "subtotal de 106,50 + 15");
  verificar(rascunho.itens[0].observacao === "sem cebola", "observação mantida");

  const invalido = montarRascunho(
    [
      { produtoId: "inexistente", quantidade: 1 },
      { produtoId: "bacon", quantidade: 1 }, // adicional como produto
      { produtoId: "agnus", quantidade: 0 },
      { produtoId: "agnus", quantidade: 1.5 },
      { produtoId: "agnus", quantidade: 100 },
      { produtoId: "agnus", quantidade: 1, adicionais: [{ produtoId: "sanctum", quantidade: 1 }] }, // produto como adicional
      null,
      "lixo",
    ],
    CARDAPIO
  );

  verificar(invalido.rascunho.itens.length === 1 && invalido.rascunho.itens[0].produtoId === "agnus", "só sobra o item válido");
  verificar(invalido.rascunho.itens[0].adicionais.length === 0, "produto usado como adicional é descartado");
  verificar(invalido.avisos.length >= 6, "cada descarte vira aviso");
  verificar(montarRascunho("não é lista", CARDAPIO).rascunho.itens.length === 0, "itens fora do formato: rascunho vazio");

  const juntos = montarRascunho(
    [
      { produtoId: "agnus", quantidade: 1 },
      { produtoId: "agnus", quantidade: 2 },
      { produtoId: "agnus", quantidade: 1, observacao: "ao ponto" },
    ],
    CARDAPIO
  );

  verificar(juntos.rascunho.itens.length === 2 && juntos.rascunho.itens[0].quantidade === 3 && juntos.rascunho.itens[0].subtotal === 120, "linhas idênticas se juntam");

  // ---------- Resumo ----------
  const resumo = resumoDoPedido(rascunho);

  verificar(resumo.includes("2× Sanctum — 100") && resumo.includes("+ 1× Bacon extra — 6,50"), "resumo com os valores do cardápio, no preço premium (sem R$; inteiro sem centavos)");
  verificar(resumo.includes("Subtotal: 121,50"), "subtotal no resumo (centavos continuam quando o valor não é inteiro)");
  verificar(resumoDoPedido({ itens: [], subtotal: 0 }) === "", "sem itens, sem resumo");

  // ---------- Resposta completa ----------
  const completa = interpretarRespostaDaBeatriz(
    json({
      intencao: "PEDIDO",
      resposta: "Anotei! Sai R$ 99,00 no total. Pode me passar o endereço?",
      itens: [{ produtoId: "sanctum", quantidade: 1 }],
      cliente: { nome: "Ana", endereco: null },
      pendencias: ["ENDERECO"],
      pedidoConfirmadoPeloCliente: true,
      precisaDeHumano: false,
      resumoParaOperador: "Ana quer 1 Sanctum.",
    }),
    CARDAPIO
  );

  verificar(!completa.resposta.includes("99,00"), "o valor inventado pela IA não chega ao cliente");
  verificar(completa.resposta.includes("Pode me passar o endereço?") && completa.resposta.includes("Subtotal: 50 "), "fala da Beatriz + resumo do sistema (preço premium: 50, sem R$ nem centavos)");
  verificar(completa.pendencias.includes("ENDERECO") && !completa.pendencias.includes("NOME") && !completa.pendencias.includes("ITENS"), "pendências conferidas com os fatos");
  verificar(!completa.pedidoConfirmadoPeloCliente && completa.pendencias.includes("CONFIRMACAO"), "confirmação sem endereço não vale");

  const fechado = interpretarRespostaDaBeatriz(
    json({
      intencao: "PEDIDO",
      resposta: "Perfeito, vou passar para a equipe!",
      itens: [{ produtoId: "agnus", quantidade: 2 }],
      cliente: { nome: "Bia", endereco: "Rua A, 10, Centro", referencia: "perto da praça" },
      pendencias: [],
      pedidoConfirmadoPeloCliente: true,
      precisaDeHumano: false,
    }),
    CARDAPIO
  );

  verificar(fechado.pedidoConfirmadoPeloCliente && fechado.pendencias.length === 0, "pedido completo e confirmado, sem pendências");
  verificar(fechado.cliente.referencia === "perto da praça", "referência do endereço guardada");
  verificar(!fechado.precisaDeHumano, "não precisa de humano");

  // Reclamação vai para uma pessoa
  const reclamacao = interpretarRespostaDaBeatriz(
    json({ intencao: "RECLAMACAO", resposta: "Sinto muito pelo ocorrido.", itens: [], precisaDeHumano: false }),
    CARDAPIO
  );

  verificar(reclamacao.precisaDeHumano && reclamacao.motivoHumano === "Reclamação do cliente.", "reclamação sempre vai para uma pessoa");

  // IA anotou só item inexistente num pedido
  const inventado = interpretarRespostaDaBeatriz(
    json({ intencao: "PEDIDO", resposta: "Anotado!", itens: [{ produtoId: "pizza", quantidade: 1 }] }),
    CARDAPIO
  );

  verificar(inventado.precisaDeHumano && inventado.avisos.length === 1 && inventado.rascunho.itens.length === 0, "pedido só com item inventado vai para uma pessoa");

  // Resposta ilegível
  const ilegivel = interpretarRespostaDaBeatriz("Desculpe, não entendi.", CARDAPIO);

  verificar(ilegivel.precisaDeHumano && ilegivel.resposta.includes("atendente"), "resposta sem JSON vira atendimento humano");

  // Campos fora do formato
  const bagunca = interpretarRespostaDaBeatriz(
    json({ intencao: "VOAR", resposta: 123, itens: "x", cliente: "y", pendencias: ["ITENS", "OUTRA"], precisaDeHumano: "sim" }),
    CARDAPIO
  );

  verificar(bagunca.intencao === "OUTRO" && bagunca.pendencias.every((p) => ["ITENS", "NOME", "ENDERECO", "CONFIRMACAO"].includes(p)), "campos inválidos viram valores seguros");
  verificar(!bagunca.precisaDeHumano, "precisaDeHumano só vale se for exatamente true");

  // Tamanho
  const longa = interpretarRespostaDaBeatriz(json({ intencao: "DUVIDA", resposta: "a ".repeat(2000), itens: [] }), CARDAPIO);

  verificar(longa.resposta.length <= 1200, "a resposta tem tamanho máximo");
}

executarTestes();

console.log(`✅ Testes da leitura da resposta da Beatriz passaram (${verificacoes} verificações).`);
