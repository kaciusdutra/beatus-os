import { calcularEntrega } from "@/core/delivery/deliveryService";

import type {
  CanalPedido,
  ItemPedido,
  PedidoAdicional,
} from "../types/pedido";

import type { ItemSolicitado } from "../types/pedidoSolicitado";

// Sprint S2: o servidor é a autoridade sobre os valores do pedido.
// Funções puras, sem acesso a banco.

export class ErroDePedido extends Error {
  constructor(mensagem: string) {
    super(mensagem);

    this.name = "ErroDePedido";
  }
}

export interface ProdutoDoCatalogo {
  id: string;

  nome: string;

  categoria: string;

  ativo: boolean;
}

export interface PrecoDoCatalogo {
  produtoId: string;

  // Canal da precificação (WHATSAPP, SITE, IFOOD, 99FOOD, KEETA).
  canal: string;

  preco: number;
}

export const QUANTIDADE_MAXIMA_POR_ITEM = 99;

// Em que canal da precificação cada canal de pedido busca o preço
// (regra 7.27/7.30): venda direta usa o preço do site quando o canal não
// tem preço próprio; marketplace só usa o preço do próprio canal.
export function canaisDePreco(canal: CanalPedido): string[] {
  switch (canal) {
    case "WHATSAPP":
      return ["WHATSAPP", "SITE"];
    case "PDV":
    case "CARDAPIO_ONLINE":
      return ["SITE"];
    default:
      return [canal];
  }
}

function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function precoNoCanal(
  canal: CanalPedido,
  produtoId: string,
  precos: PrecoDoCatalogo[]
): number | undefined {
  for (const canalDePreco of canaisDePreco(canal)) {
    const achado = precos.find(
      (preco) =>
        preco.produtoId === produtoId && preco.canal === canalDePreco
    );

    if (achado && achado.preco > 0) {
      return achado.preco;
    }
  }

  return undefined;
}

function validarQuantidade(quantidade: unknown, nome: string): number {
  if (
    typeof quantidade !== "number" ||
    !Number.isInteger(quantidade) ||
    quantidade < 1 ||
    quantidade > QUANTIDADE_MAXIMA_POR_ITEM
  ) {
    throw new ErroDePedido(
      `Quantidade inválida para ${nome}: use um número inteiro de 1 a ${QUANTIDADE_MAXIMA_POR_ITEM}.`
    );
  }

  return quantidade;
}

export interface PedidoCalculado {
  itens: ItemPedido[];

  subtotal: number;

  descontos: number;

  taxaEntrega: number;

  total: number;

  distanciaEntregaKm: number;

  regraEntregaAplicada?: string;
}

export function calcularPedidoNoServidor(entrada: {
  canal: CanalPedido;

  itens: ItemSolicitado[];

  distanciaEntregaKm: number | null;

  // Marketplace: a plataforma entrega, então não há distância nem taxa.
  semEntrega?: boolean;

  produtos: ProdutoDoCatalogo[];

  precos: PrecoDoCatalogo[];
}): PedidoCalculado {
  if (!Array.isArray(entrada.itens) || entrada.itens.length === 0) {
    throw new ErroDePedido("O pedido precisa ter pelo menos um item.");
  }

  const itens: ItemPedido[] = [];

  for (const solicitado of entrada.itens) {
    const produto = entrada.produtos.find(
      (candidato) => candidato.id === solicitado.produtoId
    );

    if (!produto || !produto.ativo) {
      throw new ErroDePedido(
        "Produto não encontrado ou inativo no cardápio."
      );
    }

    if (produto.categoria.trim().toUpperCase() === "ADICIONAL") {
      throw new ErroDePedido(
        `"${produto.nome}" é um adicional e só pode ser pedido junto de um produto.`
      );
    }

    const quantidade = validarQuantidade(
      solicitado.quantidade,
      produto.nome
    );

    const preco = precoNoCanal(
      entrada.canal,
      produto.id,
      entrada.precos
    );

    if (preco === undefined) {
      throw new ErroDePedido(
        `"${produto.nome}" não tem preço definido para este canal. Defina em Financeiro → Precificação.`
      );
    }

    const adicionais: PedidoAdicional[] = [];

    for (const adicionalSolicitado of solicitado.adicionais ?? []) {
      const adicional = entrada.produtos.find(
        (candidato) => candidato.id === adicionalSolicitado.produtoId
      );

      if (
        !adicional ||
        !adicional.ativo ||
        adicional.categoria.trim().toUpperCase() !== "ADICIONAL"
      ) {
        throw new ErroDePedido("Adicional não encontrado ou inativo.");
      }

      const quantidadeAdicional = validarQuantidade(
        adicionalSolicitado.quantidade,
        adicional.nome
      );

      const precoAdicional = precoNoCanal(
        entrada.canal,
        adicional.id,
        entrada.precos
      );

      if (precoAdicional === undefined) {
        throw new ErroDePedido(
          `O adicional "${adicional.nome}" não tem preço definido para este canal.`
        );
      }

      adicionais.push({
        id: adicional.id,
        nome: adicional.nome,
        quantidade: quantidadeAdicional,
        precoUnitario: precoAdicional,
        subtotal: centavos(precoAdicional * quantidadeAdicional),
      });
    }

    const subtotalAdicionais = adicionais.reduce(
      (soma, adicional) => soma + adicional.subtotal,
      0
    );

    itens.push({
      produtoId: produto.id,
      nome: produto.nome,
      quantidade,
      precoUnitario: preco,
      subtotal: centavos(preco * quantidade + subtotalAdicionais),
      adicionais: adicionais.length > 0 ? adicionais : undefined,
      observacao: solicitado.observacao?.trim() || undefined,
    });
  }

  let taxaEntrega = 0;

  let distanciaEntregaKm = 0;

  let regraEntregaAplicada: string | undefined = "ENTREGA_DO_MARKETPLACE";

  if (!entrada.semEntrega) {
    const entrega = calcularEntrega(entrada.distanciaEntregaKm);

    if (entrega.status !== "CALCULADO" || entrada.distanciaEntregaKm === null) {
      throw new ErroDePedido(entrega.mensagem);
    }

    taxaEntrega = entrega.taxa;

    distanciaEntregaKm = entrada.distanciaEntregaKm;

    regraEntregaAplicada = entrega.regraAplicada;
  }

  const subtotal = centavos(
    itens.reduce((soma, item) => soma + item.subtotal, 0)
  );

  return {
    itens,
    subtotal,
    descontos: 0,
    taxaEntrega,
    total: centavos(subtotal + taxaEntrega),
    distanciaEntregaKm,
    regraEntregaAplicada,
  };
}
