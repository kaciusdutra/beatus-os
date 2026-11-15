import LoginPage from "@/modules/acesso/pages/LoginPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  const { proximo } = await searchParams;

  return <LoginPage proximo={typeof proximo === "string" ? proximo : undefined} />;
}
