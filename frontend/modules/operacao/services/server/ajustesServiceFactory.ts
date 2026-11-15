import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { criarAjustesRepositoryPostgres } from "../../repositories/postgres/ajustesRepositoryPostgres";

import { AjustesDoDiaService } from "../ajustesDoDiaService";

export function getAjustesService(): AjustesDoDiaService {
  return new AjustesDoDiaService(criarAjustesRepositoryPostgres(criarContextoDesenvolvimento()));
}
