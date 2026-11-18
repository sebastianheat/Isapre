// Traspaso de leads al jefe de equipo (admin), sin costo para él:
// - Leads sin dueño del equipo actual: sin asignar o asignados a alguien que
//   ya no es vendedor (Cynthia, el superadmin info@, usuarios borrados). Se
//   excluyen los Ganados (ya vendidos).
// - Leads impugnados (falsos): quedan en la etapa "Impugnado" para que el
//   jefe intente recuperarlos.
// No descuenta créditos ni suma planes a pagar (asignacionCobrada = false).

import { kvDel, kvMarcarUnaVez, kvSet } from "./store";
import { LEAD_TTL_SECONDS, listarLeads, obtenerLead, type Lead } from "./leads";
import { listarUsuarios } from "./usuarios";
import { vende } from "./roles";
import type { NotaLead } from "./pipeline";
import { enviarPush } from "./push";

export interface Candidatos {
  sinDueno: Lead[];
  impugnados: Lead[];
}

const low = (s?: string) => (s ?? "").trim().toLowerCase();

// El jefe de equipo: el primer usuario con rol admin.
export async function jefeDeEquipo(): Promise<{ email: string; nombre?: string } | null> {
  const admins = (await listarUsuarios())
    .filter((u) => u.role === "admin")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return admins[0] ? { email: low(admins[0].email), nombre: admins[0].nombre } : null;
}

export function elegirCandidatos(leads: Lead[], vendedores: string[], destino: string): Candidatos {
  const equipo = new Set(vendedores.map(low));
  const dest = low(destino);
  return {
    sinDueno: leads.filter(
      (l) => !l.falso && l.etapa !== "ganado" && (!l.asignadoA || !equipo.has(low(l.asignadoA))),
    ),
    impugnados: leads.filter((l) => l.falso && low(l.asignadoA) !== dest),
  };
}

export async function candidatosTraspaso(destino: string): Promise<Candidatos> {
  const [leads, usuarios] = await Promise.all([listarLeads(5000), listarUsuarios()]);
  return elegirCandidatos(leads, usuarios.filter((u) => vende(u.role)).map((u) => u.email), destino);
}

function nota(texto: string, autor: string): NotaLead {
  return { id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, texto, fecha: new Date().toISOString(), autor };
}

// Pasa un lead al destino sin costo. Usa el mismo candado que el reparto.
export async function traspasarLead(leadId: string, destino: string, motivo: string, por: string): Promise<Lead | null> {
  const lock = `lock:asignacion:${leadId}`;
  if (!(await kvMarcarUnaVez(lock, 15))) return null;
  try {
    const lead = await obtenerLead(leadId);
    if (!lead) return null;
    const antes = lead.asignadoA ? `antes: ${lead.asignadoA}` : "estaba sin asignar";
    const final: Lead = {
      ...lead,
      asignadoA: low(destino),
      assignmentStatus: "asignado",
      asignacionCobrada: false,
      etapa: lead.falso ? "impugnado" : lead.etapa,
      actualizado: new Date().toISOString(),
      notas: [...(lead.notas ?? []), nota(`↪️ ${motivo} (${antes}).`, por)],
    };
    await kvSet(leadId, JSON.stringify(final), LEAD_TTL_SECONDS);
    return final;
  } finally {
    await kvDel(lock).catch(() => {});
  }
}

export async function traspasarCandidatos(
  destino: string,
  por: string,
): Promise<{ sinDueno: number; impugnados: number; fallidos: string[] }> {
  const c = await candidatosTraspaso(destino);
  const fallidos: string[] = [];
  let sinDueno = 0;
  let impugnados = 0;
  for (const l of c.sinDueno) {
    if (await traspasarLead(l.id ?? "", destino, "Lead antiguo sin dueño del equipo: traspasado al jefe de equipo", por)) sinDueno++;
    else fallidos.push(l.nombre);
  }
  for (const l of c.impugnados) {
    if (await traspasarLead(l.id ?? "", destino, "Lead impugnado: traspasado al jefe de equipo para recuperarlo", por)) impugnados++;
    else fallidos.push(l.nombre);
  }
  if (sinDueno + impugnados > 0) {
    await enviarPush(destino, {
      titulo: "📥 Te traspasaron leads",
      cuerpo: [sinDueno ? `${sinDueno} antiguos sin dueño` : null, impugnados ? `${impugnados} impugnados` : null]
        .filter(Boolean)
        .join(" · "),
      url: "/admin/leads",
      tag: "traspaso",
    }).catch(() => {});
  }
  return { sinDueno, impugnados, fallidos };
}
