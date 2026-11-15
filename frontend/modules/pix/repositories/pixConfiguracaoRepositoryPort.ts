export interface PixSalvo {
  chave?: string;
  nomeRecebedor?: string;
  cidade?: string;
}

// Porta de persistência da configuração do Pix. O serviço só conhece esta
// interface; o Prisma fica na implementação em ./postgres.
export interface PixConfiguracaoRepositoryPort {
  buscar(): Promise<PixSalvo>;

  salvar(dados: Required<PixSalvo>, operador?: string | null): Promise<PixSalvo>;
}
