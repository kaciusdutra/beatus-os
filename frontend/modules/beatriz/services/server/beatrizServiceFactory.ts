import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { ModeloAnthropic } from "../../modelos/modeloAnthropic";

import { criarCardapioParaIARepositoryPostgres } from "../../repositories/postgres/cardapioParaIARepositoryPostgres";

import { BeatrizService } from "../beatrizService";

export function getBeatrizService(): BeatrizService {
  return new BeatrizService(
    criarCardapioParaIARepositoryPostgres(criarContextoDesenvolvimento()),
    new ModeloAnthropic()
  );
}
