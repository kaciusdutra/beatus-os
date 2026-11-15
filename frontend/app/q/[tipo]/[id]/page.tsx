import FichaPorQrPage from "@/modules/qr/pages/FichaPorQrPage";

export default async function Page({
  params,
}: {
  params: Promise<{ tipo: string; id: string }>;
}) {
  const { tipo, id } = await params;

  return <FichaPorQrPage tipo={tipo} id={id} />;
}
