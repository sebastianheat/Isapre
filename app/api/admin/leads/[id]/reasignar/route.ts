// Reasigna un lead ya asignado (US-006b, solo superadmin): devuelve 1 crédito
// al ejecutivo original y descuenta 1 del nuevo. Body: { ejecutivo, permitirSinSaldo? }

import { obtenerSesion } from "@/lib/auth";
import { reasignarLead, statusDeRechazo } from "@/lib/reparto";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede reasignar leads." }, { status: 403 });
  }
  const { id } = await ctx.params;
  let body: { ejecutivo?: unknown; permitirSinSaldo?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (typeof body.ejecutivo !== "string" || !body.ejecutivo) {
    return Response.json({ error: "ejecutivo es obligatorio" }, { status: 400 });
  }
  const r = await reasignarLead(decodeURIComponent(id), body.ejecutivo, sesion.email, {
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
