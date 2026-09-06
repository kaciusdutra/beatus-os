import {
  EmpresaContext,
} from "@/core/context/empresaContext";

import {
  FornecedorRepositoryPostgres,
} from "./fornecedorRepositoryPostgres";

export function criarFornecedorRepositoryPostgres(
  contexto: EmpresaContext,
): FornecedorRepositoryPostgres {
  return new FornecedorRepositoryPostgres(
    contexto
  );
}