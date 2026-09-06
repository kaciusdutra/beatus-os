import { FichaTecnicaService } from "../fichaTecnicaService";

import {
  FichaTecnicaRepositoryPostgres,
} from "../../repositories/postgres/fichaTecnicaRepositoryPostgres";

import {
  InsumoRepositoryPostgres,
} from "../../../insumos/repositories/postgres/insumoRepositoryPostgres";

import {
  criarContextoDesenvolvimento,
} from "@/core/context/empresaContext";


export function criarFichaTecnicaService(): FichaTecnicaService {
  const contexto =
    criarContextoDesenvolvimento();

  const repository =
    new FichaTecnicaRepositoryPostgres(
      contexto
    );

  const insumoRepository =
    new InsumoRepositoryPostgres(
      contexto
    );

  return new FichaTecnicaService(
    repository,
    insumoRepository
  );
}