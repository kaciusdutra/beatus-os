import { configuracaoPadrao } from "@/modules/operacao/services/horarios";

import { agoraNoFusoDoSite, calcularFuncionamento } from "./funcionamento";

import { montarCardapio, type PrecoDaBase, type ProdutoDaBase } from "./montarCardapio";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

// ---------- Cardápio ----------
const produto = (id: string, nome: string, categoria: string, ativo = true): ProdutoDaBase => ({ id, nome, descricao: ` ${nome} descrição `, categoria, ativo });

const produtos = [
  produto("1", "Agnus", "HAMBÚRGUER"),
  produto("2", "Beatus Clássico", "HAMBÚRGUER"),
  produto("3", "Batata", "ACOMPANHAMENTO"),
  produto("4", "Refrigerante", "BEBIDA"),
  produto("5", "Pudim", "SOBREMESA"),
  produto("6", "Inativo", "HAMBÚRGUER", false),
  produto("7", "Sem preço no site", "HAMBÚRGUER"),
  produto("8", "Combo da casa", "COMBO"),
  produto("9", "Categoria nova", "PORÇÕES"),
  produto("10", "  ", "HAMBÚRGUER"),
];

const precos: PrecoDaBase[] = [
  { produtoId: "1", canal: "SITE", preco: 44.9 },
  { produtoId: "2", canal: "SITE", preco: 39.999 },
  { produtoId: "3", canal: "SITE", preco: 18 },
  { produtoId: "4", canal: "SITE", preco: 7 },
  { produtoId: "5", canal: "SITE", preco: 12 },
  { produtoId: "6", canal: "SITE", preco: 30 },
  { produtoId: "7", canal: "IFOOD", preco: 50 },
  { produtoId: "8", canal: "SITE", preco: 59.9 },
  { produtoId: "9", canal: "SITE", preco: 25 },
  { produtoId: "10", canal: "SITE", preco: 25 },
  { produtoId: "1", canal: "WHATSAPP", preco: 1 },
];

const cardapio = montarCardapio(produtos, precos);

verificar(JSON.stringify(cardapio.map((c) => c.titulo)) === JSON.stringify(["Hambúrgueres", "Combos", "Acompanhamentos", "Bebidas", "Sobremesas", "Outros"]), "ordem das categorias, com a nova no fim");
verificar(cardapio[0].itens.map((i) => i.nome).join(",") === "Agnus,Beatus Clássico", "itens em ordem alfabética, sem inativo, sem preço no site e sem nome vazio");
verificar(cardapio[0].itens[0].preco === 44.9, "preço do canal Site, não o de outro canal");
verificar(cardapio[0].itens[1].preco === 40, "preço arredondado em centavos");
verificar(cardapio[0].itens[0].descricao === "Agnus descrição", "descrição aparada");
verificar(!JSON.stringify(cardapio).includes("custo") && !JSON.stringify(cardapio).includes("margem"), "nada de custo nem margem");
verificar(Object.keys(cardapio[0].itens[0]).sort().join(",") === "descricao,id,nome,preco", "só os campos públicos");
verificar(montarCardapio([], []).length === 0, "cardápio vazio");
verificar(montarCardapio([produto("1", "A", "HAMBÚRGUER")], [{ produtoId: "1", canal: "SITE", preco: 0 }]).length === 0, "preço zero não aparece");
verificar(montarCardapio([produto("1", "A", "HAMBÚRGUER")], [{ produtoId: "1", canal: "SITE", preco: Number.NaN }]).length === 0, "preço inválido não aparece");

// ---------- Fuso ----------
// 18/11/2026 é quarta-feira. 21:00 UTC = 17:00 em Manaus (UTC-4).
const manaus = agoraNoFusoDoSite(new Date("2026-11-18T21:00:00Z"));

verificar(manaus.data === "2026-11-18" && manaus.minutos === 17 * 60, "relógio de Manaus a partir do UTC");

const viradaDeDia = agoraNoFusoDoSite(new Date("2026-11-19T02:30:00Z"));

verificar(viradaDeDia.data === "2026-11-18" && viradaDeDia.minutos === 22 * 60 + 30, "no UTC já é dia 19, em Manaus ainda é dia 18");

// ---------- Aberto agora ----------
const config = configuracaoPadrao();

const em = (data: string, hora: number, minuto = 0) => ({ data, minutos: hora * 60 + minuto });

const antes = calcularFuncionamento(config, em("2026-11-18", 17));

verificar(antes.situacao === "VAI_ABRIR_HOJE" && !antes.recebePedidos && antes.texto === "Abrimos hoje às 18:00.", "quarta 17h: vai abrir hoje");

const aberto = calcularFuncionamento(config, em("2026-11-18", 19, 30));

verificar(aberto.situacao === "ABERTO" && aberto.recebePedidos && aberto.texto === "Aberto agora, até as 22:00.", "quarta 19h30: aberto");
verificar(calcularFuncionamento(config, em("2026-11-18", 18)).situacao === "ABERTO", "na hora de abrir já está aberto");
verificar(calcularFuncionamento(config, em("2026-11-18", 22)).situacao === "ENCERRADO_HOJE", "na hora de fechar já encerrou");

const encerrado = calcularFuncionamento(config, em("2026-11-18", 22, 30));

verificar(encerrado.situacao === "ENCERRADO_HOJE" && !encerrado.recebePedidos && encerrado.texto === "Encerramos por hoje. Abrimos amanhã às 18:00.", "quarta 22h30: abre amanhã");

const sexta = calcularFuncionamento(config, em("2026-11-20", 22, 30));

verificar(sexta.situacao === "ABERTO" && sexta.fechamento === "23:00", "sexta fecha às 23h");

const segunda = calcularFuncionamento(config, em("2026-11-16", 12));

verificar(segunda.situacao === "FECHADO_HOJE" && !segunda.recebePedidos && segunda.texto === "Fechados hoje. Abrimos quarta-feira às 18:00.", "segunda: dia de produção, abre quarta");
verificar(segunda.proximaAbertura?.data === "2026-11-18", "data da próxima abertura");

const domingoNoite = calcularFuncionamento(config, em("2026-11-22", 23));

verificar(domingoNoite.texto === "Encerramos por hoje. Abrimos quarta-feira às 18:00.", "domingo à noite: pula segunda e terça");

// Exceções
const comFeriado = { ...configuracaoPadrao(), excecoes: [{ id: "e1", inicio: "2026-11-18", fim: "2026-11-18", aberto: false }] };

const feriado = calcularFuncionamento(comFeriado, em("2026-11-18", 19));

verificar(feriado.situacao === "FECHADO_HOJE" && feriado.texto === "Fechados hoje. Abrimos amanhã às 18:00.", "exceção fechada vale sobre o horário normal");

const segundaAberta = { ...configuracaoPadrao(), excecoes: [{ id: "e2", inicio: "2026-11-16", fim: "2026-11-16", aberto: true, abertura: "12:00", fechamento: "15:00" }] };

verificar(calcularFuncionamento(segundaAberta, em("2026-11-16", 13)).situacao === "ABERTO", "exceção abre uma segunda");

// Horário estragado nunca abre.
const estragado = { ...configuracaoPadrao(), excecoes: [{ id: "e3", inicio: "2026-11-18", fim: "2026-11-18", aberto: true, abertura: "25:99", fechamento: "22:00" }] };

verificar(!calcularFuncionamento(estragado, em("2026-11-18", 19)).recebePedidos, "horário mal configurado não recebe pedido");

// Sem nenhum dia aberto.
const tudoFechado = { semanal: configuracaoPadrao().semanal.map(() => ({ aberto: false })), excecoes: [] };

verificar(calcularFuncionamento(tudoFechado, em("2026-11-18", 19)).texto === "Fechados hoje. Sem previsão de abertura.", "casa sempre fechada não quebra");

console.log(`✅ Testes do site (cardápio e funcionamento) passaram (${verificacoes} verificações).`);
