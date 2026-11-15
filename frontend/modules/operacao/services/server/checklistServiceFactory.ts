import "server-only";

import { prisma } from "@/lib/prisma";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import { criarChecklistRepositoryPostgres } from "../../repositories/postgres/checklistRepositoryPostgres";

import { ChecklistDoDiaService } from "../checklistDoDiaService";

import { criarChecklistFatosPostgres } from "./checklistFatosPostgres";

import { getHorarioService } from "./horarioServiceFactory";

export function getChecklistService(): ChecklistDoDiaService {
  const contexto = criarContextoDesenvolvimento();

  return new ChecklistDoDiaService(
    criarChecklistRepositoryPostgres(contexto),
    criarChecklistFatosPostgres(contexto),
    getHorarioService(),
    async (dados) => {
      await registrarAtividade(prisma, { entidade: "OPERACAO", ...dados });
    }
  );
}
