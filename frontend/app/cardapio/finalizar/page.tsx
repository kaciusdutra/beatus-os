import FinalizarPedido from "@/modules/checkout/components/FinalizarPedido";

import { cardapioDaPagina } from "@/modules/site/services/server/cardapioDaPagina";

export const metadata = {
  title: "Finalizar pedido",
};

export default async function FinalizarPage() {
  const { funcionamento } = await cardapioDaPagina();

  return <FinalizarPedido recebePedidos={funcionamento.recebePedidos} textoDeFuncionamento={funcionamento.texto} />;
}
