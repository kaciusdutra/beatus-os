import "server-only";

import {
  criarContextoDesenvolvimento,
} from "@/core/context/empresaContext";

import {
  ProdutoRepositoryPostgres,
} from "../../repositories/postgres/produtoRepositoryPostgres";

import { ProdutoService } from "../produtoService";

export function criarProdutoServicePostgres(): ProdutoService {
  return new ProdutoService(
    new ProdutoRepositoryPostgres(
      criarContextoDesenvolvimento()
    )
  );
}
