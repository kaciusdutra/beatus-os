import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { ModeloAnthropic } from "../../modelos/modeloAnthropic";

import { criarCardapioParaIARepositoryPostgres } from "../../repositories/postgres/cardapioParaIARepositoryPostgres";

import { MemoriaDoClienteRepositoryPostgres } from "../../repositories/postgres/memoriaDoClienteRepositoryPostgres";

import { BeatrizService } from "../beatrizService";

export function getBeatrizService(): BeatrizService {
  const contexto = criarContextoDesenvolvimento();

  return new BeatrizService(
    criarCardapioParaIARepositoryPostgres(contexto),
    new ModeloAnthropic(),
    new MemoriaDoClienteRepositoryPostgres(contexto)
  );
}
