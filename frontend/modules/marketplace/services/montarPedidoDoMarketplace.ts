import type { PedidoSolicitado } from "@/modules/pedidos/types/pedidoSolicitado";

import type { PedidoDaPlataforma } from "../types/marketplace";

export interface PedidoMontado {
  solicitado: PedidoSolicitado;
  // Códigos dos itens que ainda não têm produto ligado
  semVinculo: { codigoItemExterno: string; nome: string }[];
  codigo: string;
}

// Transforma o pedido da plataforma no pedido do Beatus. Item com produto
// ligado vira item do cardápio; item sem vínculo entra pelo preço da plataforma
// e sem baixa de estoque, até o Kacius ligá-lo. O pedido nunca é recusado por
// causa de vínculo.
export function montarPedidoDoMarketplace(
  pedido: PedidoDaPlataforma,
  vinculos: Map<string, string | null>
): PedidoMontado {
  if (!pedido.itens || pedido.itens.length === 0) {
    throw new Error("O pedido da plataforma veio sem itens.");
  }

  const itens: PedidoSolicitado["itens"] = [];

  const itensSemVinculo: NonNullable<PedidoSolicitado["marketplace"]>["itensSemVinculo"] = [];

  const semVinculo: PedidoMontado["semVinculo"] = [];

  for (const item of pedido.itens) {
    const produtoId = vinculos.get(item.codigoItemExterno);

    if (produtoId) {
      itens.push({
        produtoId,
        quantidade: item.quantidade,
        observacao: item.observacao,
        precoDaPlataforma: item.precoUnitario,
      });
    } else {
      itensSemVinculo.push({
        nome: item.nome,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        observacao: item.observacao,
      });

      semVinculo.push({ codigoItemExterno: item.codigoItemExterno, nome: item.nome });
    }
  }

  const codigo = (pedido.codigoExibicao ?? pedido.idExterno).trim();

  return {
    codigo,
    semVinculo,
    solicitado: {
      canal: pedido.canal,
      entrada: "API",
      itens,
      distanciaEntregaKm: null,
      marketplace: {
        codigo,
        nomeCliente: pedido.nomeCliente,
        itensSemVinculo,
      },
      // O servidor ignora cliente, endereço e pagamento do marketplace.
      pagamento: { modalidade: "ELETRONICO", forma: "OUTRO", status: "APROVADO" },
    },
  };
}
