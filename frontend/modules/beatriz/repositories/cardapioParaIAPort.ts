import type { CanalPedido } from "@/modules/pedidos/types/pedido";

import type { ItemDoCardapioIA } from "../services/cardapioParaIA";

// Porta de leitura do cardápio para a Beatriz. O serviço só conhece esta
// interface; o Prisma fica na implementação em ./postgres.
export interface CardapioParaIAPort {
  carregar(canal: CanalPedido): Promise<ItemDoCardapioIA[]>;
}
