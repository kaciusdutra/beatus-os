import { lerLinkDoCarrinho, montarLinkDoCarrinho } from "./linkDoCarrinho";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const A = "3f2b8c1e-9a47-4d6b-8e21-5c0d7a9b1f34";

const B = "aaaaaaaa-1111-2222-3333-444444444444";

const link = montarLinkDoCarrinho("https://beatus.exemplo.com/", {
  origem: "WHATSAPP",
  telefone: "(92) 99123-4567",
  itens: [{ produtoId: A, quantidade: 2, observacao: "sem cebola e com molho à parte ✓" }, { produtoId: B, quantidade: 1 }],
});

verificar(link.startsWith("https://beatus.exemplo.com/cardapio/finalizar?c="), "endereço do checkout");
verificar(!/[+/=]/.test(link.split("?c=")[1]), "código seguro para endereço");

const lido = lerLinkDoCarrinho(link.split("?c=")[1]);

verificar(lido?.origem === "WHATSAPP" && lido.telefone === "92991234567", "origem e telefone voltam");
verificar(lido?.itens.length === 2 && lido.itens[0].produtoId === A && lido.itens[0].quantidade === 2, "itens voltam");
verificar(lido?.itens[0].observacao === "sem cebola e com molho à parte ✓", "observação com acento e símbolo");
verificar(lido?.itens[1].observacao === undefined, "item sem observação");

// Sem telefone e origem do site.
const simples = lerLinkDoCarrinho(montarLinkDoCarrinho("", { origem: "CARDAPIO_ONLINE", itens: [{ produtoId: A, quantidade: 1 }] }).split("?c=")[1]);

verificar(simples?.origem === "CARDAPIO_ONLINE" && simples.telefone === undefined, "origem do site sem telefone");

// Tudo que não for um link da Beatriz vira nulo.
verificar(lerLinkDoCarrinho(undefined) === null && lerLinkDoCarrinho("") === null, "sem código");
verificar(lerLinkDoCarrinho("isso nao e um codigo!") === null, "caracteres inválidos");
verificar(lerLinkDoCarrinho("AAAA") === null, "código que não é JSON");
verificar(lerLinkDoCarrinho("x".repeat(7000)) === null, "código enorme");

function codigoDe(objeto: unknown): string {
  const link = montarLinkDoCarrinho("", { origem: "WHATSAPP", itens: [{ produtoId: A, quantidade: 1 }] }).split("?c=")[1];

  // recodifica um conteúdo qualquer do mesmo jeito do gerador
  const bytes = new TextEncoder().encode(JSON.stringify(objeto));

  let binario = "";

  for (const byte of bytes) {
    binario += String.fromCharCode(byte);
  }

  void link;

  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

verificar(lerLinkDoCarrinho(codigoDe({ o: "W", i: [] })) === null, "sem itens");
verificar(lerLinkDoCarrinho(codigoDe({ o: "W", i: [{ p: A, q: 0 }] })) === null, "quantidade zero");
verificar(lerLinkDoCarrinho(codigoDe({ o: "W", i: [{ p: A, q: 99 }] })) === null, "quantidade demais");
verificar(lerLinkDoCarrinho(codigoDe({ o: "W", i: [{ p: A, q: 1.5 }] })) === null, "quantidade quebrada");
verificar(lerLinkDoCarrinho(codigoDe({ o: "W", i: [{ p: "curto", q: 1 }] })) === null, "id curto demais");
verificar(lerLinkDoCarrinho(codigoDe({ o: "W", i: [{ p: "../../etc/passwd", q: 1 }] })) === null, "id com caminho");
verificar(lerLinkDoCarrinho(codigoDe({ o: "W", i: [{ p: A, q: 1 }, { p: A, q: 2 }] })) === null, "produto repetido");
verificar(lerLinkDoCarrinho(codigoDe({ o: "W", i: Array.from({ length: 31 }, (_, n) => ({ p: `aaaaaaaa-0000-0000-0000-${String(n).padStart(12, "0")}`, q: 1 })) })) === null, "itens demais");
verificar(lerLinkDoCarrinho(codigoDe([1, 2, 3])) === null && lerLinkDoCarrinho(codigoDe("texto")) === null && lerLinkDoCarrinho(codigoDe(null)) === null, "formatos que não são o esperado");

// Um preço escondido no link nunca é lido (o servidor refaz).
const comPreco = lerLinkDoCarrinho(codigoDe({ o: "W", i: [{ p: A, q: 1, preco: 0.01, total: 1 }], total: 0 }));

verificar(comPreco !== null && !("preco" in comPreco.itens[0]) && !("total" in comPreco), "preço no link é ignorado");

// Origem desconhecida cai na do site; telefone ruim é descartado; observação é limpa.
const meio = lerLinkDoCarrinho(codigoDe({ o: "X", t: "123", i: [{ p: A, q: 1, n: "linha\n\u0000quebrada" }] }));

verificar(meio?.origem === "CARDAPIO_ONLINE" && meio.telefone === undefined && meio.itens[0].observacao === "linha  quebrada", "origem, telefone e observação saneados");

console.log(`✅ Testes do link do carrinho passaram (${verificacoes} verificações).`);
