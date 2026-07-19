import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0D47A1",
  width: "device-width",
  initialScale: 1,
};

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Google Ads gtag.js: solo cargamos si está configurado el ID en env. Sin ID
// la tag no carga y los eventos `conversion` quedan en no-op (no rompen nada).
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

export const metadata: Metadata = {
  title: "Cotiza tu Isapre en 30 segundos · nuevaisapre.cl",
  description:
    "Comparamos los 2.183 planes de las 7 isapres y te mostramos los 3 mejores para tu bolsillo. Asesoría gratuita por WhatsApp.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body style={{ fontFamily: "var(--font-inter), Inter, system-ui, sans-serif" }}>
        {children}
        {GOOGLE_ADS_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('set', 'allow_enhanced_conversions', true);
                gtag('config', '${GOOGLE_ADS_ID}', { allow_enhanced_conversions: true });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
