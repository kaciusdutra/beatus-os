import {
  EmpresaContext,
} from "@/core/context/empresaContext";

import {
  EntradaCompraRepositoryPostgres,
} from "./entradaCompraRepositoryPostgres";

export function criarEntradaCompraRepositoryPostgres(
  contexto: EmpresaContext,
): EntradaCompraRepositoryPostgres {
  return new EntradaCompraRepositoryPostgres(
    contexto
  );
}