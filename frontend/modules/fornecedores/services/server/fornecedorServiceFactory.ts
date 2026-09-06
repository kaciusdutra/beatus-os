import "server-only";

import {
  criarContextoDesenvolvimento,
} from "@/core/context/empresaContext";

import {
  FornecedorService,
} from "../fornecedorService";

import {
  criarFornecedorRepositoryPostgres,
} from "../../repositories/postgres";

export function criarFornecedorServicePostgres(): FornecedorService {
  const contexto =
    criarContextoDesenvolvimento();

  const repository =
    criarFornecedorRepositoryPostgres(
      contexto
    );

  return new FornecedorService(
    repository
  );
}