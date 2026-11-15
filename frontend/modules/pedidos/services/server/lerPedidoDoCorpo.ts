import "server-only";

import type { CanalPedido } from "../../types/pedido";

import type { ItemSolicitado } from "../../types/pedidoSolicitado";

// Lê do corpo da requisição só o que importa para calcular um pedido: canal,
// itens (com adicionais) e distância. Qualquer preço ou total que venha é ignorado.
export function lerPedidoDoCorpo(corpo: unknown): {
  canal: CanalPedido;
  itens: ItemSolicitado[];
  distanciaEntregaKm: number | null;
} {
  const dados = (corpo ?? {}) as Record<string, unknown>;

  const itens = Array.isArray(dados.itens)
    ? (dados.itens as Record<string, unknown>[]).map((item) => ({
        produtoId: typeof item?.produtoId === "string" ? item.produtoId : "",
        quantidade: item?.quantidade as number,
        observacao: typeof item?.observacao === "string" ? item.observacao : undefined,
        adicionais: Array.isArray(item?.adicionais)
          ? (item.adicionais as Record<string, unknown>[]).map((adicional) => ({
              produtoId:
                typeof adicional?.produtoId === "string"
                  ? adicional.produtoId
                  : typeof adicional?.id === "string"
                    ? adicional.id
                    : "",
              quantidade: adicional?.quantidade as number,
            }))
          : undefined,
      }))
    : [];

  return {
    canal: dados.canal as CanalPedido,
    itens,
    distanciaEntregaKm:
      typeof dados.distanciaEntregaKm === "number" ? dados.distanciaEntregaKm : null,
  };
}
