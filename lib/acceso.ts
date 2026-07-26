// Reglas de visibilidad de leads por rol.
//
// superadmin: ve y administra todos los leads, y es el único que asigna.
// ejecutivo: SOLO ve los leads que el superadmin le asignó (asignadoA = su
// email). El filtro se aplica en el servidor (páginas y API), nunca solo en
// el cliente, para que un ejecutivo no pueda ver leads ajenos ni por URL
// directa ni llamando a la API.

import type { Lead } from "./leads";
import type { SessionPayload } from "./auth";

export function puedeVerLead(sesion: SessionPayload, lead: Lead): boolean {
  if (sesion.role === "superadmin") return true;
  return (lead.asignadoA ?? "").trim().toLowerCase() === sesion.email.trim().toLowerCase();
}

export function filtrarLeadsVisibles(sesion: SessionPayload, leads: Lead[]): Lead[] {
  if (sesion.role === "superadmin") return leads;
  return leads.filter((l) => puedeVerLead(sesion, l));
}
