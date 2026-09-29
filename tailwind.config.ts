import type { Config } from "tailwindcss";

// preflight:false — el proyecto ya tiene admin.css y globals.css con su propio
// reset. Activar el reset de Tailwind rompería esos estilos existentes.
// Tailwind se usa solo como utilidades, sobre las superficies nuevas
// (cotizador, /panel, extensiones de /admin) según TECH-SPEC-marketplace-leads.md.
const config: Config = {
  content: [
    "./app/cotizador/**/*.{ts,tsx}",
    "./app/mi-cotizacion/**/*.{ts,tsx}",
    "./app/panel/**/*.{ts,tsx}",
    "./app/admin/creditos/**/*.{ts,tsx}",
    "./app/admin/reparto/**/*.{ts,tsx}",
    "./components/cotizador/**/*.{ts,tsx}",
    "./components/panel/**/*.{ts,tsx}",
    "./components/ui/**/*.{ts,tsx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        "azul-cotizacion": "#0F3D68",
        "azul-noche": "#0A2A47",
        "dorado-uf": "#C9973B",
        "tinta-azul": "#101B2D",
        "pizarra-media": "#4A5A6E",
        niebla: "#C7D0DA",
        "papel-calido": "#FBF7EF",
        "verde-aprobado": "#1F7A52",
        "rojo-terracota": "#B8452F",
        "ambar-aviso": "#B8791A",
        "verde-whatsapp": "#25D366",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-public-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        control: "10px",
        card: "16px",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(15,27,45,0.06)",
        "soft-lg": "0 12px 32px rgba(15,27,45,0.10)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
