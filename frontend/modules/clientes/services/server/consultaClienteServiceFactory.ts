import "server-only";

import { prisma } from "@/lib/prisma";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import { ConsultaClienteService } from "../consultaClienteService";

import { criarClienteConsultaRepositoryPostgres } from "../../repositories/postgres/clienteConsultaRepositoryPostgres";

import { criarClienteServicePostgres } from "./clienteServiceFactory";

export function getConsultaClienteService(): ConsultaClienteService {
  return new ConsultaClienteService(
    criarClienteConsultaRepositoryPostgres(criarContextoDesenvolvimento()),
    criarClienteServicePostgres(),
    async (dados) => {
      await registrarAtividade(prisma, { entidade: "CLIENTE", ...dados });
    }
  );
}
