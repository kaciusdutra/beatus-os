import { ErroDePedido, calcularPedidoNoServidor, type ProdutoDoCatalogo, type PrecoDoCatalogo, type VantagemParaCalcular } from "./calcularPedido";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const produtos: ProdutoDoCatalogo[] = [
  { id: "agnus", nome: "Agnus", categoria: "HAMBÚRGUER", ativo: true },
  { id: "ignis", nome: "Ignis", categoria: "HAMBÚRGUER", ativo: true },
  { id: "virtus", nome: "Virtus", categoria: "HAMBÚRGUER", ativo: true },
  { id: "batata", nome: "Batata Frita", categoria: "ACOMPANHAMENTO", ativo: true },
  { id: "bacon", nome: "Bacon extra", categoria: "ADICIONAL", ativo: true },
];

const precos: PrecoDoCatalogo[] = [
  { produtoId: "agnus", canal: "SITE", preco: 44.9 },
  { produtoId: "ignis", canal: "SITE", preco: 54.9 },
  { produtoId: "virtus", canal: "SITE", preco: 34.9 },
  { produtoId: "batata", canal: "SITE", preco: 14.9 },
  { produtoId: "bacon", canal: "SITE", preco: 6 },
];

function calcular(itens: { produtoId: string; quantidade: number; adicionais?: { produtoId: string; quantidade: number }[] }[], vantagem?: VantagemParaCalcular, distancia = 2.4) {
  return calcularPedidoNoServidor({ canal: "CARDAPIO_ONLINE", itens, distanciaEntregaKm: distancia, produtos, precos, vantagem });
}

function erro(funcao: () => unknown): string {
  try {
    funcao();
  } catch (e) {
    return e instanceof ErroDePedido ? e.message : "OUTRO ERRO";
  }

  return "";
}

// ---------- Sem vantagem: nada muda ----------
{
  const pedido = calcular([{ produtoId: "agnus", quantidade: 1 }]);

  verificar(pedido.descontos === 0 && pedido.vantagemAplicada === undefined && pedido.total === pedido.subtotal + pedido.taxaEntrega, "sem vantagem o cálculo é o de sempre");
}

// ---------- Item grátis ----------
const hamburguerGratis: VantagemParaCalcular = { tipo: "ITEM_GRATIS", nome: "Hambúrguer por conta da casa", categoria: "HAMBÚRGUER" };

{
  const sem = calcular([{ produtoId: "agnus", quantidade: 1 }, { produtoId: "batata", quantidade: 2 }]);

  const com = calcular([{ produtoId: "agnus", quantidade: 1 }, { produtoId: "batata", quantidade: 2 }], hamburguerGratis);

  verificar(com.descontos === 44.9 && com.subtotal === sem.subtotal, "o item grátis é abatido em descontos; o subtotal não muda");
  verificar(com.total === Math.round((sem.total - 44.9) * 100) / 100, "o total é o de sempre menos o hambúrguer");
  verificar(com.vantagemAplicada?.valorNosItens === 44.9 && com.vantagemAplicada.produtoId === "agnus" && com.vantagemAplicada.valorNaEntrega === 0, "o que foi abatido fica registrado");
  verificar(com.itens[0].precoUnitario === 44.9, "o preço do item continua o do cardápio");
}

// Só uma unidade, mesmo pedindo duas
{
  const dois = calcular([{ produtoId: "agnus", quantidade: 2 }], hamburguerGratis);

  verificar(dois.descontos === 44.9 && dois.vantagemAplicada?.valorNosItens === 44.9, "com dois do mesmo, só um sai de graça");
}

// O mais caro que se encaixa
{
  const varios = calcular([{ produtoId: "virtus", quantidade: 1 }, { produtoId: "ignis", quantidade: 1 }, { produtoId: "agnus", quantidade: 1 }], hamburguerGratis);

  verificar(varios.descontos === 54.9 && varios.vantagemAplicada?.produtoId === "ignis", "sem teto, sai de graça o hambúrguer mais caro do pedido");

  const comTeto = calcular([{ produtoId: "virtus", quantidade: 1 }, { produtoId: "ignis", quantidade: 1 }, { produtoId: "agnus", quantidade: 1 }], { ...hamburguerGratis, valorMaximo: 45 });

  verificar(comTeto.descontos === 44.9 && comTeto.vantagemAplicada?.produtoId === "agnus", "com teto de R$ 45, o Ignis não entra: sai o Agnus");
}

// Não elegível
verificar(erro(() => calcular([{ produtoId: "batata", quantidade: 1 }], hamburguerGratis)).includes("categoria HAMBÚRGUER"), "sem hambúrguer no pedido, a vantagem não se aplica e diz o que pedir");
verificar(erro(() => calcular([{ produtoId: "ignis", quantidade: 1 }], { ...hamburguerGratis, valorMaximo: 40 })).includes("até R$ 40,00"), "só item acima do teto: não se aplica");
verificar(calcular([{ produtoId: "batata", quantidade: 1 }], { tipo: "ITEM_GRATIS" }).descontos === 14.9, "sem categoria, qualquer produto serve");

// Adicional não é item grátis e não entra no desconto
{
  const comAdicional = calcular([{ produtoId: "agnus", quantidade: 1, adicionais: [{ produtoId: "bacon", quantidade: 1 }] }], hamburguerGratis);

  verificar(comAdicional.descontos === 44.9 && comAdicional.subtotal === 50.9, "o adicional continua pago: só o preço do hambúrguer é abatido");
}

// ---------- Desconto em % ----------
{
  const pedido = calcular([{ produtoId: "agnus", quantidade: 1 }, { produtoId: "ignis", quantidade: 1 }], { tipo: "DESCONTO_PERCENTUAL", percentual: 10 });

  verificar(pedido.subtotal === 99.8 && pedido.descontos === 9.98 && pedido.total === Math.round((99.8 - 9.98 + pedido.taxaEntrega) * 100) / 100, "10% sobre os itens, sem tocar na entrega");
  verificar(pedido.vantagemAplicada?.valorNaEntrega === 0, "o desconto em % não mexe na taxa de entrega");
}

verificar(erro(() => calcular([{ produtoId: "agnus", quantidade: 1 }], { tipo: "DESCONTO_PERCENTUAL", percentual: 0 })).includes("porcentagem"), "porcentagem zero é recusada");
verificar(erro(() => calcular([{ produtoId: "agnus", quantidade: 1 }], { tipo: "DESCONTO_PERCENTUAL", percentual: 120 })).includes("porcentagem"), "porcentagem acima de 100 é recusada");
verificar(calcular([{ produtoId: "agnus", quantidade: 1 }], { tipo: "DESCONTO_PERCENTUAL", percentual: 100 }).descontos === 44.9, "100% abate todos os itens, e não mais que isso");

// ---------- Entrega grátis ----------
{
  const sem = calcular([{ produtoId: "agnus", quantidade: 1 }]);

  const com = calcular([{ produtoId: "agnus", quantidade: 1 }], { tipo: "ENTREGA_GRATIS" });

  verificar(sem.taxaEntrega > 0 && com.taxaEntrega === 0 && com.descontos === 0, "entrega grátis zera a taxa e não mexe nos itens");
  verificar(com.total === com.subtotal && com.regraEntregaAplicada === "VANTAGEM_ENTREGA_GRATIS", "o total fica só com os itens e a regra fica registrada");
  verificar(com.vantagemAplicada?.valorNaEntrega === sem.taxaEntrega && com.vantagemAplicada.valorNosItens === 0, "registra quanto da taxa foi abatido");
}

// ---------- Segurança ----------
verificar(erro(() => calcularPedidoNoServidor({ canal: "IFOOD", itens: [{ produtoId: "agnus", quantidade: 1 }], distanciaEntregaKm: null, semEntrega: true, produtos, precos: [{ produtoId: "agnus", canal: "IFOOD", preco: 60 }], vantagem: hamburguerGratis })).includes("canal próprio"), "marketplace nunca recebe vantagem do clube");
verificar(erro(() => calcular([{ produtoId: "agnus", quantidade: 1 }], { tipo: "INVENTADA" as never })).includes("desconhecida"), "tipo desconhecido é recusado");

// A regra do selo: itens menos descontos precisa chegar a R$ 50
{
  const pedido = calcular([{ produtoId: "agnus", quantidade: 1 }, { produtoId: "ignis", quantidade: 1 }], hamburguerGratis);

  // Ignis (o mais caro) é o prêmio: sobra o Agnus, R$ 44,90 em itens: abaixo de R$ 50, não dá selo.
  verificar(Math.round((pedido.subtotal - pedido.descontos) * 100) / 100 === 44.9, "itens depois do desconto: R$ 44,90 (abaixo de R$ 50: sem selo)");

  const maior = calcular([{ produtoId: "agnus", quantidade: 1 }, { produtoId: "ignis", quantidade: 1 }, { produtoId: "batata", quantidade: 1 }], hamburguerGratis);

  verificar(Math.round((maior.subtotal - maior.descontos) * 100) / 100 === 59.8, "com mais itens: R$ 59,80 em itens depois do desconto (dá selo)");
}

console.log(`✅ Testes do cálculo do pedido com vantagem passaram (${verificacoes} verificações).`);
