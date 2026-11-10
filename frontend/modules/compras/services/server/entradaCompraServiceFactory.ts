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

import {
  criarInsumoRepositoryPostgres,
} from "@/modules/insumos/repositories/postgres/insumoRepositoryPostgres";

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

  const insumoRepository =
    criarInsumoRepositoryPostgres(
      contexto
    );

  return new EntradaCompraService(
    entradaCompraRepository,
    fornecedorRepository,
    insumoRepository
  );
}