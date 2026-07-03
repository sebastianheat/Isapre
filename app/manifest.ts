// Web App Manifest: hace instalable el panel como app en el celular
// ("Agregar a pantalla de inicio" en Android/Chrome e iOS/Safari).
// start_url apunta al pipeline — al abrir la "app" los ejecutivos caen
// directo en su tablero.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nueva Isapre · Panel de ejecutivos",
    short_name: "Nueva Isapre",
    description: "Pipeline de leads, recordatorios y cotizaciones de Nueva Isapre.",
    start_url: "/admin/pipeline",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#082D6E",
    theme_color: "#0D47A1",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
