import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Isapres Chile — Cotiza con Romina",
  description: "Cotiza tu plan de salud Nueva Masvida conversando con Romina.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
