import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { PrecificacaoService } from "../precificacaoService";

import { criarPrecificacaoRepositoryPostgres } from "../../repositories/postgres/precificacaoRepositoryPostgres";

export function criarPrecificacaoServicePostgres(): PrecificacaoService {
  const contexto = criarContextoDesenvolvimento();

  return new PrecificacaoService(
    criarPrecificacaoRepositoryPostgres(contexto)
  );
}
