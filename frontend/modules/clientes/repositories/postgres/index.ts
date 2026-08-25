import {
  EmpresaContext,
} from "@/core/context/empresaContext";

import {
  ClienteRepositoryPostgres,
} from "./clienteRepositoryPostgres";

export function criarClienteRepositoryPostgres(
  contexto: EmpresaContext,
): ClienteRepositoryPostgres {
  return new ClienteRepositoryPostgres(
    contexto
  );
}