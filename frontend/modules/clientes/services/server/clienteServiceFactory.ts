import "server-only";

import {
  criarContextoDesenvolvimento,
} from "@/core/context/empresaContext";

import {
  ClienteService,
} from "../clienteService";

import {
  criarClienteRepositoryPostgres,
} from "../../repositories/postgres";

export function criarClienteServicePostgres(): ClienteService {
  const contexto =
    criarContextoDesenvolvimento();

  const repository =
    criarClienteRepositoryPostgres(
      contexto
    );

  return new ClienteService(
    repository
  );
}