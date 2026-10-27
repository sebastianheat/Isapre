// Reimporta leads pegados desde los logs de Vercel (solo superadmin, o el
// equipo técnico con Bearer ESTADO_ACCESOS_TOKEN).
// Body: { texto: string, asignaciones?: string, repartir?: boolean }
// `asignaciones`: "correo del lead ; ejecutivo" por línea. Esos leads quedan
// con ese ejecutivo SIN mandarle correo (ya lo recibió) y descontando crédito.

import { obtenerSesion } from "@/lib/auth";
import { autorizadoPorToken } from "@/lib/token-operacion";
import { extraerLeadsDeTexto, leerAsignaciones, restaurarLeads } from "@/lib/restaurar-leads";
import { asignarAutomatico } from "@/lib/reparto-auto";
import { asignarLead } from "@/lib/reparto";
import { listarUsuarios } from "@/lib/usuarios";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let actor = "reimportación";
  if (!autorizadoPorToken(req)) {
    const sesion = await obtenerSesion();
    if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
    if (sesion.role !== "superadmin") {
      return Response.json({ error: "Solo el superadmin puede reimportar leads." }, { status: 403 });
    }
    actor = sesion.email;
  }
  let body: { texto?: unknown; asignaciones?: unknown; repartir?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (typeof body.texto !== "string" || !body.texto.trim()) {
    return Response.json({ error: "Pega el texto de los logs o un arreglo JSON." }, { status: 400 });
  }
  const leads = extraerLeadsDeTexto(body.texto);
  if (leads.length === 0) {
    return Response.json({ error: "No encontré leads en el texto pegado." }, { status: 400 });
  }

  const asignaciones = leerAsignaciones(typeof body.asignaciones === "string" ? body.asignaciones : "");
  const usuarios = asignaciones.size > 0 ? await listarUsuarios() : [];
  const buscarEjecutivo = (s: string) => {
    const q = s.trim().toLowerCase();
    return usuarios.find((u) => u.email.toLowerCase() === q || (u.nombre ?? "").trim().toLowerCase() === q);
  };

  const r = await restaurarLeads(leads);
  const asignados: string[] = [];
  const sinAsignar: string[] = [];
  for (const l of r.restaurados) {
    const destino = l.email ? asignaciones.get(l.email.toLowerCase()) : undefined;
    if (destino) {
      const ej = buscarEjecutivo(destino);
      if (!ej) {
        sinAsignar.push(`${l.nombre}: no encontré al ejecutivo "${destino}"`);
        continue;
      }
      const a = await asignarLead(l.id ?? "", ej.email, actor, { permitirSinSaldo: true, avisar: false });
      if (a.ok) asignados.push(`${l.nombre} → ${ej.nombre || ej.email}`);
      else sinAsignar.push(`${l.nombre}: ${a.mensaje}`);
    } else if (body.repartir === true) {
      const a = await asignarAutomatico(l.id ?? "").catch(() => null);
      if (a?.ok) asignados.push(`${l.nombre} → ${a.lead.asignadoA} (automático)`);
      else sinAsignar.push(`${l.nombre}: quedó en Reparto`);
    } else {
      sinAsignar.push(`${l.nombre}: quedó en Reparto`);
    }
  }
  return Response.json({
    encontrados: leads.length,
    restaurados: r.restaurados.map((l) => l.nombre),
    yaExistian: r.yaExistian,
    descartados: r.descartados,
    asignados,
    sinAsignar,
  });
}
