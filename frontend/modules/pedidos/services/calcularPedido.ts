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

export function precoNoCanal(
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

// Uma vantagem do clube (seção 28) para abater do pedido. Quem chama já conferiu que o cliente tem direito a ela.
export interface VantagemParaCalcular {
  tipo: "ITEM_GRATIS" | "DESCONTO_PERCENTUAL" | "ENTREGA_GRATIS";

  nome?: string;

  // ITEM_GRATIS: categoria do produto que pode sair de graça (vazio = qualquer produto).
  categoria?: string | null;

  // ITEM_GRATIS: preço máximo do item grátis (vazio = qualquer preço).
  valorMaximo?: number | null;

  // DESCONTO_PERCENTUAL: de 0 a 100, sobre os itens.
  percentual?: number | null;
}

export interface VantagemAplicada {
  tipo: VantagemParaCalcular["tipo"];

  nome?: string;

  // Quanto saiu dos itens (o que conta como "valor do prêmio" na regra do selo).
  valorNosItens: number;

  // Quanto saiu da taxa de entrega.
  valorNaEntrega: number;

  // ITEM_GRATIS: o produto que saiu de graça.
  produtoId?: string;
}

export interface PedidoCalculado {
  itens: ItemPedido[];

  subtotal: number;

  descontos: number;

  taxaEntrega: number;

  total: number;

  distanciaEntregaKm: number;

  regraEntregaAplicada?: string;

  // Só quando uma vantagem do clube entrou na conta.
  vantagemAplicada?: VantagemAplicada;
}

export function calcularPedidoNoServidor(entrada: {
  canal: CanalPedido;

  itens: ItemSolicitado[];

  distanciaEntregaKm: number | null;

  // Marketplace: a plataforma entrega, então não há distância nem taxa.
  semEntrega?: boolean;

  // Marketplace integrado: usa o preço da plataforma quando o produto não tem
  // preço no canal, e aceita itens que ainda não têm produto ligado.
  aceitarPrecoDaPlataforma?: boolean;

  itensSemVinculo?: {
    nome: string;
    quantidade: number;
    precoUnitario: number;
    observacao?: string;
  }[];

  // Vantagem do clube a abater (só pedidos de canal próprio, com entrega).
  vantagem?: VantagemParaCalcular;

  produtos: ProdutoDoCatalogo[];

  precos: PrecoDoCatalogo[];
}): PedidoCalculado {
  if (
    !Array.isArray(entrada.itens) ||
    (entrada.itens.length === 0 && !entrada.itensSemVinculo?.length)
  ) {
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

    let preco = precoNoCanal(
      entrada.canal,
      produto.id,
      entrada.precos
    );

    if (
      preco === undefined &&
      entrada.aceitarPrecoDaPlataforma &&
      solicitado.precoDaPlataforma !== undefined &&
      Number.isFinite(solicitado.precoDaPlataforma) &&
      solicitado.precoDaPlataforma > 0
    ) {
      preco = solicitado.precoDaPlataforma;
    }

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

  // Itens da plataforma sem produto ligado: preço da plataforma, sem estoque.
  for (const avulso of entrada.itensSemVinculo ?? []) {
    const quantidade = validarQuantidade(avulso.quantidade, avulso.nome);

    if (!Number.isFinite(avulso.precoUnitario) || avulso.precoUnitario < 0) {
      throw new ErroDePedido(`Preço inválido no item "${avulso.nome}".`);
    }

    itens.push({
      produtoId: "",
      nome: avulso.nome,
      quantidade,
      precoUnitario: avulso.precoUnitario,
      subtotal: centavos(avulso.precoUnitario * quantidade),
      observacao: avulso.observacao?.trim() || undefined,
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

  // Vantagem do clube: abate dos itens (item grátis, desconto em %) ou da taxa de entrega. O preço dos itens
  // não muda: o abatimento aparece em "descontos", e o total é refeito aqui, no servidor.
  let descontos = 0;

  let vantagemAplicada: VantagemAplicada | undefined;

  if (entrada.vantagem) {
    const vantagem = entrada.vantagem;

    if (entrada.semEntrega || entrada.aceitarPrecoDaPlataforma) {
      throw new ErroDePedido("A vantagem do clube só vale em pedido de canal próprio.");
    }

    if (vantagem.tipo === "ITEM_GRATIS") {
      const categoria = vantagem.categoria?.trim().toUpperCase();

      const elegiveis = itens.filter((item) => {
        const produto = entrada.produtos.find((candidato) => candidato.id === item.produtoId);

        return (
          item.produtoId !== "" &&
          produto !== undefined &&
          (!categoria || produto.categoria.trim().toUpperCase() === categoria) &&
          (vantagem.valorMaximo === null || vantagem.valorMaximo === undefined || item.precoUnitario <= vantagem.valorMaximo)
        );
      });

      if (elegiveis.length === 0) {
        throw new ErroDePedido(
          `Para usar a vantagem do clube, peça um item${vantagem.categoria ? ` da categoria ${vantagem.categoria}` : ""}${
            vantagem.valorMaximo ? ` de até R$ ${vantagem.valorMaximo.toFixed(2).replace(".", ",")}` : ""
          }.`
        );
      }

      // O item de maior preço que se encaixa, uma unidade só.
      const escolhido = elegiveis.reduce((maior, item) => (item.precoUnitario > maior.precoUnitario ? item : maior));

      descontos = centavos(escolhido.precoUnitario);

      vantagemAplicada = { tipo: vantagem.tipo, nome: vantagem.nome, valorNosItens: descontos, valorNaEntrega: 0, produtoId: escolhido.produtoId };
    } else if (vantagem.tipo === "DESCONTO_PERCENTUAL") {
      const percentual = vantagem.percentual ?? 0;

      if (!(percentual > 0 && percentual <= 100)) {
        throw new ErroDePedido("A vantagem do clube está com a porcentagem inválida.");
      }

      descontos = Math.min(subtotal, centavos((subtotal * percentual) / 100));

      vantagemAplicada = { tipo: vantagem.tipo, nome: vantagem.nome, valorNosItens: descontos, valorNaEntrega: 0 };
    } else if (vantagem.tipo === "ENTREGA_GRATIS") {
      vantagemAplicada = { tipo: vantagem.tipo, nome: vantagem.nome, valorNosItens: 0, valorNaEntrega: taxaEntrega };

      taxaEntrega = 0;

      regraEntregaAplicada = "VANTAGEM_ENTREGA_GRATIS";
    } else {
      throw new ErroDePedido("Vantagem do clube desconhecida.");
    }
  }

  return {
    itens,
    subtotal,
    descontos,
    taxaEntrega,
    total: centavos(subtotal - descontos + taxaEntrega),
    distanciaEntregaKm,
    regraEntregaAplicada,
    ...(vantagemAplicada ? { vantagemAplicada } : {}),
  };
}
