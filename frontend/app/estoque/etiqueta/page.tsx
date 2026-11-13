import EtiquetaPage from "@/modules/estoque/pages/EtiquetaPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;

  return (
    <EtiquetaPage
      parametros={{
        fichaTecnicaId: p.fichaTecnicaId,
        producaoLoteId: p.producaoLoteId,
        gavetaId: p.gavetaId,
        local: p.local,
      }}
    />
  );
}
