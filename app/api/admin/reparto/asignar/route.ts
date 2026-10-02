// Asigna un lead sin asignar a un ejecutivo (solo superadmin).
// Body: { leadId, ejecutivo, permitirSinSaldo? }

import { obtenerSesion } from "@/lib/auth";
import { asignarLead, statusDeRechazo } from "@/lib/reparto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede asignar leads." }, { status: 403 });
  }
  let body: { leadId?: unknown; ejecutivo?: unknown; permitirSinSaldo?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (typeof body.leadId !== "string" || typeof body.ejecutivo !== "string" || !body.leadId || !body.ejecutivo) {
    return Response.json({ error: "leadId y ejecutivo son obligatorios" }, { status: 400 });
  }
  const r = await asignarLead(body.leadId, body.ejecutivo, sesion.email, {
    permitirSinSaldo: body.permitirSinSaldo === true,
  });
  if (!r.ok) {
    return Response.json(
      { error: r.mensaje, code: r.code, asignadoA: r.asignadoA },
      { status: statusDeRechazo(r.code) },
    );
  }
  return Response.json({ lead: r.lead, cobrado: r.cobrado, saldo: r.saldo });
}
