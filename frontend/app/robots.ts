import type { MetadataRoute } from "next";

// O que os buscadores (Google etc.) podem ler: só o site. O sistema interno fica de fora.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/cardapio"],
        disallow: ["/api/", "/login", "/primeiro-acesso", "/conta", "/configuracoes", "/financeiro"],
      },
    ],
  };
}
