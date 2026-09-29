import { CotizadorShell } from "@/components/cotizador/cotizador-shell";

// Pantalla insignia del Skill #8 (UI) — implementa el screen flow completo
// de docs/ui-design/screen-flows/cotizador-publico.md con datos de muestra
// (lib/cotizador-mock-data.ts). El catálogo real y la persistencia llegan
// en /build, una vez migrada la base de datos (Fase 1 del Blueprint).
export default function CotizadorPage() {
  return <CotizadorShell />;
}
