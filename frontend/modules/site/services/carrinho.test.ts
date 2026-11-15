import {
  MAXIMO_DE_ITENS,
  MAXIMO_POR_ITEM,
  adicionar,
  alterarQuantidade,
  dinheiro,
  lerCarrinhoGuardado,
  quantidadeNoCarrinho,
  totalDoCarrinho,
  type ItemDoCarrinho,
} from "./carrinho";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const agnus = { id: "a", nome: "Agnus", preco: 44.9 };

const batata = { id: "b", nome: "Batata", preco: 18 };

let carrinho: ItemDoCarrinho[] = [];

carrinho = adicionar(carrinho, agnus);
carrinho = adicionar(carrinho, agnus);
carrinho = adicionar(carrinho, batata);

verificar(carrinho.length === 2 && carrinho[0].quantidade === 2, "mesmo produto soma a quantidade");
verificar(quantidadeNoCarrinho(carrinho) === 3, "quantidade total");
verificar(totalDoCarrinho(carrinho) === 107.8, "total (44,90 x 2 + 18)");

// Limites
let cheio = carrinho;

for (let i = 0; i < 40; i++) {
  cheio = adicionar(cheio, agnus);
}

verificar(cheio[0].quantidade === MAXIMO_POR_ITEM, "no máximo 20 de cada item");

let muitos: ItemDoCarrinho[] = [];

for (let i = 0; i < MAXIMO_DE_ITENS + 10; i++) {
  muitos = adicionar(muitos, { id: `p${i}`, nome: `P${i}`, preco: 10 });
}

verificar(muitos.length === MAXIMO_DE_ITENS, "no máximo 30 itens diferentes");

// Alterar e remover
verificar(alterarQuantidade(carrinho, "a", 5)[0].quantidade === 5, "muda a quantidade");
verificar(alterarQuantidade(carrinho, "a", 0).length === 1, "zero tira o item");
verificar(alterarQuantidade(carrinho, "a", -3).length === 1, "negativo tira o item");
verificar(alterarQuantidade(carrinho, "a", Number.NaN).length === 1, "valor inválido tira o item");
verificar(alterarQuantidade(carrinho, "a", 999)[0].quantidade === MAXIMO_POR_ITEM, "quantidade limitada");
verificar(alterarQuantidade(carrinho, "a", 2.9)[0].quantidade === 2, "quantidade quebrada vira inteira");
verificar(alterarQuantidade(carrinho, "inexistente", 4).length === 2, "item inexistente não faz nada");
verificar(carrinho[0].quantidade === 2, "o carrinho original não é alterado");

// Arredondamento
verificar(totalDoCarrinho([{ id: "x", nome: "X", preco: 0.1, quantidade: 3 }]) === 0.3, "0,1 x 3 dá 0,30 (sem erro de ponto flutuante)");
verificar(totalDoCarrinho([]) === 0, "carrinho vazio");

// Armazenamento do navegador
verificar(lerCarrinhoGuardado(null).length === 0 && lerCarrinhoGuardado("lixo").length === 0 && lerCarrinhoGuardado({}).length === 0, "armazenamento sem lista");

const guardado = lerCarrinhoGuardado([
  { id: "a", nome: "Agnus", preco: 44.9, quantidade: 2 },
  { id: "a", nome: "Repetido", preco: 1, quantidade: 1 },
  { id: "b", nome: "Sem preço", preco: 0, quantidade: 1 },
  { id: "c", nome: "Preço negativo", preco: -5, quantidade: 1 },
  { id: "d", nome: "Quantidade quebrada", preco: 5, quantidade: 1.5 },
  { id: "e", nome: "Quantidade zero", preco: 5, quantidade: 0 },
  { id: "f", nome: "Quantidade enorme", preco: 5, quantidade: 9999 },
  { id: 7, nome: "Id numérico", preco: 5, quantidade: 1 },
  { id: "g", nome: "", preco: 5, quantidade: 1 },
  { id: "h", nome: "Texto no preço", preco: "5", quantidade: 1 },
  null,
  "solto",
]);

verificar(guardado.map((item) => item.id).join(",") === "a,f", "só entra o que tem a forma certa, sem repetir");
verificar(guardado[1].quantidade === MAXIMO_POR_ITEM, "quantidade guardada é limitada");

const enorme = lerCarrinhoGuardado(Array.from({ length: 100 }, (_, i) => ({ id: `i${i}`, nome: "X", preco: 1, quantidade: 1 })));

verificar(enorme.length === MAXIMO_DE_ITENS, "lista guardada enorme é cortada");

verificar(dinheiro(44.9).replace(/\s/g, " ") === "R$ 44,90", "formata em reais");

console.log(`✅ Testes do carrinho do site passaram (${verificacoes} verificações).`);
