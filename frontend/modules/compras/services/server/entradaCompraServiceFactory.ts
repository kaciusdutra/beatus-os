import "server-only";

import {
  criarContextoDesenvolvimento,
} from "@/core/context/empresaContext";

import {
  EntradaCompraService,
} from "../entradaCompraService";

import {
  criarEntradaCompraRepositoryPostgres,
} from "../../repositories/postgres";

import {
  criarFornecedorRepositoryPostgres,
} from "@/modules/fornecedores/repositories/postgres";

export function criarEntradaCompraServicePostgres():
  EntradaCompraService {
  const contexto =
    criarContextoDesenvolvimento();

  const entradaCompraRepository =
    criarEntradaCompraRepositoryPostgres(
      contexto
    );

  const fornecedorRepository =
    criarFornecedorRepositoryPostgres(
      contexto
    );

  return new EntradaCompraService(
    entradaCompraRepository,
    fornecedorRepository
  );
}