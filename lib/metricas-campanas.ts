// Leads por campaña de Google Ads (Métricas, solo superadmin), con el resto de
// los canales como referencia. Los leads de Google Ads anteriores al 13-11-2026
// no tienen ID de campaña (antes no se guardaba).

import type { Lead } from "./leads";
import { nombreCampana } from "./campanas";

export interface FilaCampana {
  nombre: string;
  esCampana: boolean; // false = canal sin campaña (referencia)
  total: number;
  ultimos7: number;
  ultimos30: number;
  calificados: number;
  ganados: number;
  falsos: number;
}

const CANALES: Record<string, string> = {
  "meta-ads": "Meta Ads",
  whatsapp: "WhatsApp",
  "web-organico": "Web orgánico",
};

export function leadsPorCampana(leads: Lead[], nombres: Record<string, string> = {}, ahora = Date.now()): FilaCampana[] {
  const dia = 24 * 60 * 60 * 1000;
  const filas = new Map<string, FilaCampana>();
  for (const l of leads) {
    const canal = l.canal ?? "web-organico";
    const nombre =
      canal === "google-ads"
        ? nombreCampana(l, nombres) ?? "Google Ads (sin campaña registrada)"
        : CANALES[canal] ?? canal;
    const esCampana = canal === "google-ads" && !!l.campanaId;
    const f = filas.get(nombre) ?? { nombre, esCampana, total: 0, ultimos7: 0, ultimos30: 0, calificados: 0, ganados: 0, falsos: 0 };
    const t = l.fecha ? Date.parse(l.fecha) : 0;
    f.total++;
    if (t >= ahora - 7 * dia) f.ultimos7++;
    if (t >= ahora - 30 * dia) f.ultimos30++;
    if (l.calidad === "calificado") f.calificados++;
    if (l.etapa === "ganado") f.ganados++;
    if (l.falso) f.falsos++;
    filas.set(nombre, f);
  }
  return [...filas.values()].sort(
    (a, b) => Number(b.esCampana) - Number(a.esCampana) || b.ultimos30 - a.ultimos30 || b.total - a.total,
  );
}
