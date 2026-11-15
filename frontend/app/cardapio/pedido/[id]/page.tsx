import AcompanharPedido from "@/modules/checkout/components/AcompanharPedido";

export const metadata = {
  title: "Seu pedido",
};

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <AcompanharPedido checkoutId={id} />;
}
