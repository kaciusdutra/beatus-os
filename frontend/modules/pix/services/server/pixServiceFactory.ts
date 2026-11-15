import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { PixService } from "../pixService";

import { criarPixConfiguracaoRepositoryPostgres } from "../../repositories/postgres/pixConfiguracaoRepositoryPostgres";

export function getPixService(): PixService {
  return new PixService(criarPixConfiguracaoRepositoryPostgres(criarContextoDesenvolvimento()));
}
