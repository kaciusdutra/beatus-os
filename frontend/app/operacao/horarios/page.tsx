import { redirect } from "next/navigation";

// Os horários agora ficam em Configurações.
export default function Page() {
  redirect("/configuracoes/horarios");
}
