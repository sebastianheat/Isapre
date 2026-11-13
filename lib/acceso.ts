// Permisos sobre los leads.
// superadmin y admin: ven todos los leads (lib/roles.ts → veTodo).
// ejecutivo: SOLO ve los leads asignados a él (asignadoA = su email). Un lead
// ajeno, para él, no existe.
// Editar un lead (etapa, calidad, datos, recordatorios): el superadmin o quien
// lo tiene asignado. El admin, en leads ajenos, solo deja notas.

import type { SessionPayload } from "./auth";
import type { Lead } from "./leads";
import { veTodo } from "./roles";

const suyo = (sesion: SessionPayload, lead: Lead) =>
  (lead.asignadoA ?? "").trim().toLowerCase() === sesion.email.trim().toLowerCase();

export function puedeVerLead(sesion: SessionPayload, lead: Lead): boolean {
  return veTodo(sesion.role) || suyo(sesion, lead);
}

export function puedeEditarLead(sesion: SessionPayload, lead: Lead): boolean {
  return sesion.role === "superadmin" || suyo(sesion, lead);
}

export function filtrarLeadsVisibles(sesion: SessionPayload, leads: Lead[]): Lead[] {
  if (veTodo(sesion.role)) return leads;
  return leads.filter((l) => suyo(sesion, l));
}
