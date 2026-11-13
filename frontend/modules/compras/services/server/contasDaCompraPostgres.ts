import "server-only";

import { getContaPagarService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { validarTitulos } from "@/modules/financeiro/services/contaPagarService";

import type { ContasDaCompraPort } from "../contasDaCompraPort";

export function criarContasDaCompraPostgres(): ContasDaCompraPort {
  return {
    validarTitulos,

    async criarTitulos(origem, titulos, operador) {
      await getContaPagarService().criarTitulos(origem, titulos, operador);
    },

    async cancelarDaCompra(entradaCompraId, motivo, operador) {
      return getContaPagarService().cancelarDaCompra(entradaCompraId, motivo, operador);
    },
  };
}
