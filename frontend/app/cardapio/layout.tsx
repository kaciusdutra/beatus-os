import type { Metadata, Viewport } from "next";

import CabecalhoDoSite from "@/modules/site/components/CabecalhoDoSite";

import CapturaDeCampanha from "@/modules/site/components/CapturaDeCampanha";

import ChatDaBeatriz from "@/modules/site/components/ChatDaBeatriz";

import CarrinhoDoSite from "@/modules/site/components/CarrinhoDoSite";

import RodapeDoSite from "@/modules/site/components/RodapeDoSite";

import { cardapioDaPagina } from "@/modules/site/services/server/cardapioDaPagina";

export const metadata: Metadata = {
  title: { default: "Beatus Burger Delivery", template: "%s · Beatus Burger Delivery" },
  description: "Cardápio e pedidos do Beatus Burger Delivery.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Beatus Burger Delivery",
    description: "Cardápio e pedidos do Beatus Burger Delivery.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

// O site público: sem login, com a marca. O menu e o topo do sistema não aparecem aqui.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { semana, funcionamento } = await cardapioDaPagina();

  return (
    <div className="min-h-[100dvh] bg-marca-preto text-slate-100">
      <CapturaDeCampanha />

      <CabecalhoDoSite />

      <main>{children}</main>

      <RodapeDoSite semana={semana} />

      <CarrinhoDoSite recebePedidos={funcionamento.recebePedidos} />

      <ChatDaBeatriz />
    </div>
  );
}
