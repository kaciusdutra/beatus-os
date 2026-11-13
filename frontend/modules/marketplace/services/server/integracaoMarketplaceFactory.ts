import "server-only";

import { prisma } from "@/lib/prisma";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import { getLancarPedidoServicePostgres } from "@/modules/pedidos/services/server/lancarPedidoServicePostgres";

import { getOperacaoPedidoService } from "@/modules/pedidos/services/server/operacaoPedidoService";

import { IfoodPlataforma } from "../../plataformas/ifoodPlataforma";

import { PlataformaPendente } from "../../plataformas/plataformaPendente";

import type { PlataformaMarketplacePort } from "../../plataformas/plataformaPort";

import { criarMarketplaceRepositoryPostgres } from "../../repositories/postgres/marketplaceRepositoryPostgres";

import type { CanalMarketplace } from "../../types/marketplace";

import {
  IntegracaoMarketplaceService,
  type PedidosDoMarketplace,
} from "../integracaoMarketplaceService";

function plataformaDoCanal(canal: CanalMarketplace): PlataformaMarketplacePort {
  return canal === "IFOOD" ? new IfoodPlataforma() : new PlataformaPendente(canal);
}

// Liga a integração ao módulo de pedidos: o pedido entra pelo mesmo lançamento do
// PDV (marketplace) e o cancelamento usa a mesma regra da Cozinha.
function pedidosDoMarketplace(): PedidosDoMarketplace {
  return {
    async criar(pedido, operador) {
      const resultado = await getLancarPedidoServicePostgres().executar({ pedido, operador });

      return {
        id: resultado.pedido.id,
        numero: String(resultado.pedido.numero),
        total: resultado.pedido.total,
      };
    },

    async cancelar(pedidoId, motivo, operador) {
      const pedido = await prisma.pedido.findUnique({
        where: { id: pedidoId },
        select: { statusOperacional: true },
      });

      if (!pedido || ["ENTREGUE", "CANCELADO"].includes(pedido.statusOperacional)) {
        return "IGNORADO";
      }

      await getOperacaoPedidoService().mudarStatus({
        pedidoId,
        novoStatus: "CANCELADO",
        motivo,
        operador,
      });

      return "CANCELADO";
    },
  };
}

export function getIntegracaoMarketplaceService(): IntegracaoMarketplaceService {
  return new IntegracaoMarketplaceService(
    criarMarketplaceRepositoryPostgres(criarContextoDesenvolvimento()),
    pedidosDoMarketplace(),
    plataformaDoCanal,
    async (dados) => {
      await registrarAtividade(prisma, { entidade: "MARKETPLACE", ...dados });
    }
  );
}
