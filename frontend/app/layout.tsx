import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { usuarioAtualDoServidor } from "@/core/auth/usuarioDoServidor";
import { SystemProvider } from "@/core/system/SystemContext";
import { UsuarioProvider } from "@/shared/auth/UsuarioContext";
import AppLayout from "@/shared/layout/AppLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beatus OS",
  description: "Sistema Operacional para Restaurantes",
};

// Tela do celular: largura do aparelho e cor da barra.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Quem entrou (o proxy conferiu a sessão). Nas telas de entrada é nulo.
  const usuario = await usuarioAtualDoServidor();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-100">
        <UsuarioProvider usuario={usuario}>
          <SystemProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </SystemProvider>
        </UsuarioProvider>
      </body>
    </html>
  );
}