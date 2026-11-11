import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { CustoFixoService } from "../custoFixoService";

import { criarCustoFixoRepositoryPostgres } from "../../repositories/postgres/custoFixoRepositoryPostgres";

export function criarCustoFixoServicePostgres(): CustoFixoService {
  const contexto = criarContextoDesenvolvimento();

  return new CustoFixoService(
    criarCustoFixoRepositoryPostgres(contexto)
  );
}
