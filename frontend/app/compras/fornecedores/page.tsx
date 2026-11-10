import FornecedoresPage from "@/modules/fornecedores/pages/FornecedoresPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    [chave: string]: string | string[] | undefined;
  }>;
}) {
  const { cnpj } = await searchParams;

  return (
    <FornecedoresPage
      cnpjInicial={
        typeof cnpj === "string"
          ? cnpj
          : undefined
      }
    />
  );
}
