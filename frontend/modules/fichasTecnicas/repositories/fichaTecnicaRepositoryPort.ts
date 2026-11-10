import { FichaTecnica } from "../types/fichaTecnica";

export interface FichaTecnicaRepositoryPort {
  listar(): Promise<FichaTecnica[]>;


  buscarPorId(
    id: string
  ): Promise<FichaTecnica | undefined>;

  buscarPorProdutoId(
    produtoId: string
  ): Promise<FichaTecnica | undefined>;

  criar(
    ficha: FichaTecnica
  ): Promise<FichaTecnica>;

  atualizar(
    ficha: FichaTecnica
  ): Promise<FichaTecnica>;
}