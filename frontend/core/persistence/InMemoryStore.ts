export class InMemoryStore<
  TEntity extends {
    id: string;
  }
> {
  private entidades =
    new Map<string, TEntity>();

  criar(
    entidade: TEntity
  ): TEntity {
    this.entidades.set(
      entidade.id,
      entidade
    );

    return entidade;
  }

  buscarPorId(
    id: string
  ): TEntity | undefined {
    return this.entidades.get(
      id
    );
  }

  listar(): TEntity[] {
    return Array.from(
      this.entidades.values()
    );
  }

  atualizar(
    entidade: TEntity
  ): TEntity {
    this.entidades.set(
      entidade.id,
      entidade
    );

    return entidade;
  }

  remover(
    id: string
  ): void {
    this.entidades.delete(id);
  }

  limpar(): void {
    this.entidades.clear();
  }

  criarSnapshot(): TEntity[] {
    return structuredClone(
      this.listar()
    );
  }

  restaurarSnapshot(
    snapshot: TEntity[]
  ): void {
    this.entidades.clear();

    for (
      const entidade of snapshot
    ) {
      this.entidades.set(
        entidade.id,
        entidade
      );
    }
  }
}