import type { MetadataRoute } from "next";

// Permite "instalar" o Beatus na tela inicial do celular. Abre direto no modo celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beatus OS",
    short_name: "Beatus",
    description: "Sistema operacional do restaurante, no celular",
    start_url: "/celular",
    scope: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icone-beatus.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
