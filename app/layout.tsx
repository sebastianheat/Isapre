import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Cotiza tu Isapre en 30 segundos · nuevaisapre.cl",
  description:
    "Comparamos los 1.782 planes de las 7 isapres y te mostramos los 3 mejores para tu bolsillo. Asesoría gratuita por WhatsApp.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body style={{ fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
