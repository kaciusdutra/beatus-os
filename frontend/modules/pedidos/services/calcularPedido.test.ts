import {
  ErroDePedido,
  calcularPedidoNoServidor,
  canaisDePreco,
  type PrecoDoCatalogo,
  type ProdutoDoCatalogo,
} from "./calcularPedido";

import type { ItemSolicitado } from "../types/pedidoSolicitado";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const PRODUTOS: ProdutoDoCatalogo[] = [
  { id: "agnus", nome: "Agnus", categoria: "HAMBÚRGUER", ativo: true },
  { id: "batata", nome: "Batata", categoria: "ACOMPANHAMENTO", ativo: true },
  { id: "extra-bacon", nome: "Bacon extra", categoria: "ADICIONAL", ativo: true },
  { id: "antigo", nome: "Antigo", categoria: "HAMBÚRGUER", ativo: false },
  { id: "sem-preco", nome: "Sem preço", categoria: "HAMBÚRGUER", ativo: true },
];

const PRECOS: PrecoDoCatalogo[] = [
  { produtoId: "agnus", canal: "SITE", preco: 50 },
  { produtoId: "agnus", canal: "IFOOD", preco: 65 },
  { produtoId: "batata", canal: "SITE", preco: 15 },
  { produtoId: "batata", canal: "WHATSAPP", preco: 14 },
  { produtoId: "extra-bacon", canal: "SITE", preco: 6.5 },
  { produtoId: "antigo", canal: "SITE", preco: 40 },
  { produtoId: "sem-preco", canal: "SITE", preco: 0 },
];

function calcular(
  itens: ItemSolicitado[],
  distancia: number | null = 2.4,
  canal: Parameters<typeof calcularPedidoNoServidor>[0]["canal"] = "PDV"
) {
  return calcularPedidoNoServidor({
    canal,
    itens,
    distanciaEntregaKm: distancia,
    produtos: PRODUTOS,
    precos: PRECOS,
  });
}

function recusa(acao: () => unknown, trecho: string, mensagem: string) {
  try {
    acao();
  } catch (erro) {
    verificar(
      erro instanceof ErroDePedido && erro.message.includes(trecho),
      `${mensagem} (recebido: ${erro instanceof Error ? erro.message : erro})`
    );

    return;
  }

  throw new Error(`Falha: ${mensagem} (não recusou)`);
}

function executarTestes(): void {
  // Exemplo do plano: dois itens de R$ 50 mais taxa de R$ 10 = R$ 110
  const dois = calcular([{ produtoId: "agnus", quantidade: 2 }]);

  verificar(dois.subtotal === 100, "subtotal de dois itens de R$ 50");
  verificar(dois.taxaEntrega === 10, "taxa de R$ 10 entre 1 e 5 km");
  verificar(dois.total === 110, "total R$ 110");
  verificar(
    dois.regraEntregaAplicada?.includes("R$ 10.00") === true,
    "regra de entrega aplicada registrada"
  );

  // Entrega grátis até 1 km
  verificar(
    calcular([{ produtoId: "agnus", quantidade: 1 }], 0.8).taxaEntrega === 0,
    "entrega grátis até 1 km"
  );

  // O preço é o do servidor: nada que a tela mande entra na conta
  const adulterado = calcular([
    {
      produtoId: "agnus",
      quantidade: 1,
      // @ts-expect-error campos que a tela não pode mandar são ignorados
      precoUnitario: 0.01,
      subtotal: 0.01,
    },
  ]);

  verificar(
    adulterado.itens[0].precoUnitario === 50 && adulterado.total === 60,
    "preço e total adulterados são ignorados"
  );

  // Adicionais
  const comAdicional = calcular([
    {
      produtoId: "agnus",
      quantidade: 1,
      adicionais: [{ produtoId: "extra-bacon", quantidade: 2 }],
    },
  ]);

  verificar(
    comAdicional.itens[0].subtotal === 63 &&
      comAdicional.itens[0].adicionais?.[0].subtotal === 13,
    "adicional entra no subtotal do item"
  );

  // Canal: WhatsApp usa o próprio preço, ou o do site; iFood só o dele
  verificar(
    calcular([{ produtoId: "batata", quantidade: 1 }], 2, "WHATSAPP")
      .itens[0].precoUnitario === 14,
    "WhatsApp usa o preço próprio"
  );

  verificar(
    calcular([{ produtoId: "agnus", quantidade: 1 }], 2, "WHATSAPP")
      .itens[0].precoUnitario === 50,
    "WhatsApp sem preço próprio usa o do site"
  );

  verificar(
    calcular([{ produtoId: "agnus", quantidade: 1 }], 2, "IFOOD")
      .itens[0].precoUnitario === 65,
    "iFood usa o preço do iFood"
  );

  recusa(
    () => calcular([{ produtoId: "batata", quantidade: 1 }], 2, "IFOOD"),
    "não tem preço definido",
    "iFood não herda o preço do site"
  );

  verificar(
    canaisDePreco("CARDAPIO_ONLINE").join() === "SITE",
    "cardápio online usa o preço do site"
  );

  // Recusas
  recusa(
    () => calcular([{ produtoId: "antigo", quantidade: 1 }]),
    "inativo",
    "produto inativo"
  );

  recusa(
    () => calcular([{ produtoId: "nao-existe", quantidade: 1 }]),
    "não encontrado",
    "produto inexistente"
  );

  recusa(
    () => calcular([{ produtoId: "sem-preco", quantidade: 1 }]),
    "não tem preço definido",
    "preço zero conta como sem preço"
  );

  recusa(
    () => calcular([{ produtoId: "agnus", quantidade: 0 }]),
    "Quantidade inválida",
    "quantidade zero"
  );

  recusa(
    () => calcular([{ produtoId: "agnus", quantidade: 1.5 }]),
    "Quantidade inválida",
    "quantidade fracionada"
  );

  recusa(
    () => calcular([{ produtoId: "agnus", quantidade: 100 }]),
    "Quantidade inválida",
    "quantidade acima do máximo"
  );

  recusa(
    () => calcular([]),
    "pelo menos um item",
    "pedido sem itens"
  );

  recusa(
    () =>
      calcular([
        {
          produtoId: "extra-bacon",
          quantidade: 1,
        },
      ]),
    "adicional",
    "adicional sozinho"
  );

  recusa(
    () =>
      calcular([
        {
          produtoId: "agnus",
          quantidade: 1,
          adicionais: [{ produtoId: "batata", quantidade: 1 }],
        },
      ]),
    "Adicional não encontrado",
    "produto comum usado como adicional"
  );

  // Entrega: fora da área e sem distância
  recusa(
    () => calcular([{ produtoId: "agnus", quantidade: 1 }], 5.4),
    "fora da área",
    "acima de 5 km"
  );

  recusa(
    () => calcular([{ produtoId: "agnus", quantidade: 1 }], null),
    "distância",
    "sem distância"
  );

  console.log(
    `✅ Testes do pedido calculado no servidor passaram (${verificacoes} verificações).`
  );
}

try {
  executarTestes();
} catch (error) {
  console.error("❌ Testes do pedido calculado no servidor falharam:");
  console.error(error);
  process.exitCode = 1;
}
