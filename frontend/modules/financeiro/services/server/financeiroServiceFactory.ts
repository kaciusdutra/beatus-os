import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { criarCustoFixoServicePostgres } from "@/modules/precificacao/services/server/custoFixoServiceFactory";

import { ConferenciaMarketplaceService } from "../conferenciaMarketplaceService";

import { ContaPagarService } from "../contaPagarService";

import { FinanceiroService } from "../financeiroService";

import { criarConferenciaMarketplaceRepositoryPostgres } from "../../repositories/postgres/conferenciaMarketplaceRepositoryPostgres";

import { criarContaPagarRepositoryPostgres } from "../../repositories/postgres/contaPagarRepositoryPostgres";

import { criarFinanceiroRepositoryPostgres } from "../../repositories/postgres/financeiroRepositoryPostgres";

function totalCustosFixos() {
  const custosFixos = criarCustoFixoServicePostgres();

  return async (em: Date) => (await custosFixos.resumo(em)).totalMensal;
}

export function getFinanceiroService(): FinanceiroService {
  const contexto = criarContextoDesenvolvimento();

  return new FinanceiroService(
    criarFinanceiroRepositoryPostgres(contexto),
    totalCustosFixos()
  );
}

export function getContaPagarService(): ContaPagarService {
  const contexto = criarContextoDesenvolvimento();

  const financeiroRepository = criarFinanceiroRepositoryPostgres(contexto);

  return new ContaPagarService(
    criarContaPagarRepositoryPostgres(contexto),
    financeiroRepository,
    new FinanceiroService(financeiroRepository, totalCustosFixos()),
    totalCustosFixos()
  );
}

export function getConferenciaMarketplaceService(): ConferenciaMarketplaceService {
  return new ConferenciaMarketplaceService(
    criarConferenciaMarketplaceRepositoryPostgres(criarContextoDesenvolvimento())
  );
}
