import { Produto } from "../types/produto";

export interface ProdutoRepositoryPort {
  listar(): Promise<Produto[]>;

  criar(produto: Produto): Promise<Produto>;
}
