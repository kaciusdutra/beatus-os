import { Insumo } from "../types/insumo";

export interface InsumoRepositoryPort {
  criar(insumo: Insumo): Promise<Insumo>;

  buscarPorId(
    id: string
  ): Promise<Insumo | undefined>;

  listar(): Promise<Insumo[]>;

  atualizar(insumo: Insumo): Promise<Insumo>;
}