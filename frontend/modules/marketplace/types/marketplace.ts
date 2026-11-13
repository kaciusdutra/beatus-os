export type CanalMarketplace = "IFOOD" | "99FOOD" | "KEETA";

export const CANAIS_MARKETPLACE: CanalMarketplace[] = ["IFOOD", "99FOOD", "KEETA"];

// Um item do pedido como a plataforma o descreve.
export interface ItemDaPlataforma {
  // Id ou código externo do item no cardápio da plataforma
  codigoItemExterno: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  observacao?: string;
}

// O pedido da plataforma já no formato do Beatus. O trecho que lê o formato
// real de cada plataforma (adaptador) é quem produz isto.
export interface PedidoDaPlataforma {
  canal: CanalMarketplace;
  // Identificador do pedido na plataforma
  idExterno: string;
  // Número curto que o lojista e o cliente veem (vira o código do pedido no Beatus)
  codigoExibicao?: string;
  nomeCliente?: string;
  itens: ItemDaPlataforma[];
  // Total cobrado pela plataforma, para conferir com o total calculado
  totalDaPlataforma?: number;
}

export type TipoDeEvento = "PEDIDO_NOVO" | "PEDIDO_CANCELADO" | "OUTRO";

export interface EventoDaPlataforma {
  // Identificador do evento na plataforma (não se repete)
  eventoId: string;
  tipo: TipoDeEvento;
  pedidoExternoId?: string;
  // Presente em PEDIDO_NOVO
  pedido?: PedidoDaPlataforma;
  // O que a plataforma mandou, guardado como veio
  bruto: unknown;
}

export type StatusDoEvento = "RECEBIDO" | "PROCESSADO" | "ERRO" | "IGNORADO";

export interface EventoRegistrado {
  id: string;
  canal: string;
  eventoId: string;
  pedidoExternoId?: string;
  tipo: string;
  status: StatusDoEvento;
  erro?: string;
  pedidoId?: string;
  confirmadoEm?: string;
  confirmacaoErro?: string;
  recebidoEm: string;
  processadoEm?: string;
}

export interface IntegracaoDoMarketplace {
  canal: string;
  ativo: boolean;
  aceiteAutomatico: boolean;
  modoSimulacao: boolean;
  idDaLoja?: string;
  ultimoContatoEm?: string;
  ultimaFalha?: string;
  // As credenciais ficam no .env; aqui só se sabe se estão preenchidas.
  credenciaisConfiguradas: boolean;
}

export interface VinculoDeItem {
  id: string;
  canal: string;
  codigoItemExterno: string;
  nomeExterno?: string;
  produtoId?: string;
  produtoNome?: string;
}

export interface PendenciasDaIntegracao {
  vinculosPendentes: number;
  eventosComErro: number;
}

export interface ResultadoDoProcessamento {
  evento: EventoRegistrado;
  // Falso quando o evento já tinha chegado antes (nada foi feito de novo)
  novo: boolean;
  avisos: string[];
}
