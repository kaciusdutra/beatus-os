import FichaEditorPage from "@/modules/fichasTecnicas/pages/FichaEditorPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    [chave: string]: string | string[] | undefined;
  }>;
}) {
  const { tipo, produtoId } = await searchParams;

  return (
    <FichaEditorPage
      tipoInicial={
        tipo === "PRODUTO" ? "PRODUTO" : "PREPARACAO"
      }
      produtoIdInicial={
        typeof produtoId === "string"
          ? produtoId
          : undefined
      }
    />
  );
}
