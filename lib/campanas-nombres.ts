// Nombres de las campañas de Google Ads que pone el superadmin en el panel
// (Reparto → Campañas). Google solo manda el ID; aquí se guarda ID → nombre.

import { kvGet, kvSet } from "./store";
import type { Lead } from "./leads";

const KEY = "campanas:nombres";

export async function leerNombresCampanas(): Promise<Record<string, string>> {
  try {
    const raw = await kvGet(KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export async function guardarNombreCampana(id: string, nombre: string): Promise<Record<string, string>> {
  if (!/^\d{1,20}$/.test(id)) throw new Error("ID de campaña inválido.");
  const limpio = nombre.trim().slice(0, 80);
  const nombres = await leerNombresCampanas();
  if (limpio) nombres[id] = limpio;
  else delete nombres[id];
  await kvSet(KEY, JSON.stringify(nombres), 0);
  return nombres;
}

// Campañas que ya trajeron leads: ID, cuántos leads y el último.
export function campanasVistas(leads: Lead[]): { id: string; leads: number; ultimo?: string }[] {
  const m = new Map<string, { id: string; leads: number; ultimo?: string }>();
  for (const l of leads) {
    if (!l.campanaId) continue;
    const c = m.get(l.campanaId) ?? { id: l.campanaId, leads: 0 };
    c.leads += 1;
    if (!c.ultimo || (l.fecha ?? "") > c.ultimo) c.ultimo = l.fecha;
    m.set(l.campanaId, c);
  }
  return [...m.values()].sort((a, b) => (b.ultimo ?? "").localeCompare(a.ultimo ?? ""));
}
