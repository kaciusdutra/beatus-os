import "server-only";

import { prisma } from "@/lib/prisma";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import { criarHorarioRepositoryPostgres } from "../../repositories/postgres/horarioRepositoryPostgres";

import { HorarioService } from "../horarioService";

export function getHorarioService(): HorarioService {
  return new HorarioService(
    criarHorarioRepositoryPostgres(criarContextoDesenvolvimento()),
    async (dados) => {
      await registrarAtividade(prisma, { entidade: "OPERACAO", ...dados });
    }
  );
}
