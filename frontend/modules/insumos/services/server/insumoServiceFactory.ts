import "server-only";

import {
  criarContextoDesenvolvimento,
} from "@/core/context/empresaContext";

import {
  InsumoService,
} from "../insumoService";

import {
  criarInsumoRepositoryPostgres,
} from "../../repositories/postgres/insumoRepositoryPostgres";

export function criarInsumoServicePostgres():
  InsumoService {
  const contexto =
    criarContextoDesenvolvimento();

  const repository =
    criarInsumoRepositoryPostgres(
      contexto
    );

  return new InsumoService(
    repository
  );
}