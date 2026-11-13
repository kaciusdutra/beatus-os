import TicketCozinhaPage from "@/modules/pedidos/pages/TicketCozinhaPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TicketCozinhaPage pedidoId={id} />;
}
