import FichaProducaoPage from "@/modules/fichasTecnicas/pages/FichaProducaoPage";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    [chave: string]: string | string[] | undefined;
  }>;
}) {
  const { id } = await params;
  const { quanto } = await searchParams;

  const quantoNumero =
    typeof quanto === "string" ? Number(quanto) : NaN;

  return (
    <FichaProducaoPage
      fichaId={id}
      quantoInicial={
        Number.isFinite(quantoNumero) && quantoNumero > 0
          ? quantoNumero
          : undefined
      }
    />
  );
}
