import "server-only";

import { prisma } from "@/lib/prisma";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import type { EstoqueDaCompraPort } from "../estoqueDaCompraPort";

export function criarEstoqueDaCompraPostgres(): EstoqueDaCompraPort {
  return {
    async registrarEntrada(dados) {
      await getEstoqueService().registrarEntradaDaCompra(dados);
    },

    async estornarEntradas(itemIds, operador) {
      await getEstoqueService().estornarEntradasDaCompra(itemIds, operador);
    },

    async registrarAtividade(dados) {
      await registrarAtividade(prisma, {
        entidade: "ENTRADA_COMPRA",
        ...dados,
      });
    },
  };
}
