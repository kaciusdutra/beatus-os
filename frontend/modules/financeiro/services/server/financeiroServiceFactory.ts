import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { criarCustoFixoServicePostgres } from "@/modules/precificacao/services/server/custoFixoServiceFactory";

import { FinanceiroService } from "../financeiroService";

import { criarFinanceiroRepositoryPostgres } from "../../repositories/postgres/financeiroRepositoryPostgres";

export function getFinanceiroService(): FinanceiroService {
  const contexto = criarContextoDesenvolvimento();

  const custosFixos = criarCustoFixoServicePostgres();

  return new FinanceiroService(
    criarFinanceiroRepositoryPostgres(contexto),
    async (em) => (await custosFixos.resumo(em)).totalMensal
  );
}
