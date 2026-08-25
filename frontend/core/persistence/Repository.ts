export interface Repository<
  TEntity,
  TId = string
> {
  criar(
    entidade: TEntity
  ): Promise<TEntity>;

  buscarPorId(
    id: TId
  ): Promise<TEntity | undefined>;

  listar(): Promise<TEntity[]>;

  atualizar(
    entidade: TEntity
  ): Promise<TEntity>;

  remover(
    id: TId
  ): Promise<void>;
}