import type { Metadata } from "next";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./tailwind-entry.css";

// Tipografía propia del marketplace (DESIGN.md) — deliberadamente distinta
// del Inter que usa el layout raíz para el resto del sitio existente.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cotiza tu plan de Isapre · nuevaisapre.cl",
  description:
    "Compara planes reales de las 7 isapres en segundos, sin RUT ni compromiso. Ve el precio y por qué cuesta eso.",
};

export default function CotizadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable} font-body bg-papel-calido text-tinta-azul min-h-screen`}
    >
      {children}
    </div>
  );
}
