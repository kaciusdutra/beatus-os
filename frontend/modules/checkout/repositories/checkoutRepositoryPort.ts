import type { MetodoDoPagamento } from "../services/statusDoGateway";

import type { CheckoutSalvo, MudancasDoCheckout, NovoCheckout } from "../types/checkout";

export interface CheckoutRepositoryPort {
  criar(novo: NovoCheckout): Promise<CheckoutSalvo>;

  buscar(id: string): Promise<CheckoutSalvo | null>;

  atualizar(id: string, mudancas: MudancasDoCheckout): Promise<CheckoutSalvo>;

  // Só um processa por vez: passa a PROCESSANDO se não estiver aprovado nem já em
  // processamento. Devolve se conseguiu (dois avisos ao mesmo tempo: só um consegue).
  reservarParaProcessar(id: string): Promise<boolean>;

  // Tira da fila os que passaram da validade sem pagamento. Devolve quantos.
  expirarVencidos(agora: Date): Promise<number>;

  // Guarda o aviso do gateway uma vez só. Diz se ele já foi tratado antes.
  registrarEvento(evento: { gateway: string; eventoId: string; transacaoExterna?: string; tipo: string; payload: unknown }): Promise<{ jaProcessado: boolean }>;

  concluirEvento(gateway: string, eventoId: string, status: "PROCESSADO" | "ERRO" | "IGNORADO", erro?: string): Promise<void>;

  // A referência do pagamento no gateway, ligada ao pagamento do pedido (para estornos).
  registrarPagamentoOnline(dados: { pagamentoId: string; gateway: string; metodo: MetodoDoPagamento; transacaoExterna: string; statusExterno: string }): Promise<void>;
}
