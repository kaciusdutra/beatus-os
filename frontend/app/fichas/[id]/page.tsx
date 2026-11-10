import FichaEditorPage from "@/modules/fichasTecnicas/pages/FichaEditorPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <FichaEditorPage fichaId={id} />;
}
