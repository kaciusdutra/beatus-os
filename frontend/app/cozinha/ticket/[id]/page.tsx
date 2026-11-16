import TicketCozinhaPage from "@/modules/pedidos/pages/TicketCozinhaPage";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const { id } = await params;

  const { auto } = await searchParams;

  return <TicketCozinhaPage pedidoId={id} automatico={auto === "1"} />;
}
