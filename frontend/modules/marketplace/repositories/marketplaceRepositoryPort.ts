import type {
  EventoDaPlataforma,
  EventoRegistrado,
  PendenciasDaIntegracao,
  StatusDoEvento,
  VinculoDeItem,
} from "../types/marketplace";

export interface ConfiguracaoSalva {
  ativo: boolean;
  aceiteAutomatico: boolean;
  modoSimulacao: boolean;
  idDaLoja?: string;
  ultimoContatoEm?: string;
  ultimaFalha?: string;
}

// Porta de persistência da integração com marketplaces. O serviço só conhece
// esta interface; o Prisma fica na implementação em ./postgres.
export interface MarketplaceRepositoryPort {
  buscarConfiguracao(canal: string): Promise<ConfiguracaoSalva>;

  salvarConfiguracao(
    canal: string,
    dados: Pick<ConfiguracaoSalva, "ativo" | "aceiteAutomatico" | "modoSimulacao" | "idDaLoja">
  ): Promise<ConfiguracaoSalva>;

  // Marca o último contato com a plataforma (ok) ou a falha.
  registrarContato(canal: string, falha?: string): Promise<void>;

  // Guarda o evento; se o mesmo evento já existir, devolve o que existe (novo = false).
  registrarEvento(
    canal: string,
    evento: EventoDaPlataforma
  ): Promise<{ registro: EventoRegistrado; novo: boolean }>;

  atualizarEvento(
    id: string,
    dados: {
      status?: StatusDoEvento;
      erro?: string | null;
      pedidoId?: string | null;
      confirmadoEm?: Date | null;
      confirmacaoErro?: string | null;
      processadoEm?: Date | null;
    }
  ): Promise<void>;

  listarEventos(canal: string | undefined, limite: number): Promise<EventoRegistrado[]>;

  // Pedido do Beatus criado a partir do evento de pedido novo daquele pedido da plataforma.
  buscarPedidoCriado(canal: string, pedidoExternoId: string): Promise<string | null>;

  // Devolve produto ligado (ou null) para cada código; os códigos novos entram como pendentes.
  resolverVinculos(
    canal: string,
    itens: { codigoItemExterno: string; nome: string }[]
  ): Promise<Map<string, string | null>>;

  listarVinculos(canal: string): Promise<VinculoDeItem[]>;

  ligarVinculo(id: string, produtoId: string | null): Promise<VinculoDeItem>;

  contarPendencias(): Promise<PendenciasDaIntegracao>;
}
