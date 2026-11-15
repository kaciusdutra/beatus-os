import "server-only";

import { prisma } from "@/lib/prisma";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import { criarAuthRepositoryPostgres } from "../../repositories/postgres/authRepositoryPostgres";

import { AuthService } from "../authService";

export function getAuthService(): AuthService {
  return new AuthService(criarAuthRepositoryPostgres(criarContextoDesenvolvimento()), async (dados) => {
    await registrarAtividade(prisma, { entidade: "ACESSO", ...dados });
  });
}
