export interface ArquivoStorage {
  salvar(
    caminhoRelativo: string,
    arquivo: File
  ): Promise<{
    caminhoRelativo: string;
    tamanho: number;
  }>;

  existe(
    caminhoRelativo: string
  ): Promise<boolean>;

  obter(
    caminhoRelativo: string
  ): Promise<Buffer>;

  excluir(
    caminhoRelativo: string
  ): Promise<void>;
}