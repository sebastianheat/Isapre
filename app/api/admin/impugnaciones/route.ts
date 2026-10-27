// Impugnaciones (solo superadmin).
// GET: cuántas hay pendientes (aviso del panel).
// POST: resolver una. Body: { leadId, aceptar: boolean, respuesta? }

import { obtenerSesion } from "@/lib/auth";
import { contarPendientes, resolverImpugnacion } from "@/lib/impugnaciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function soloSuperadmin() {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: Response.json({ error: "No autorizado" }, { status: 401 }) };
  if (sesion.role !== "superadmin") {
    return { error: Response.json({ error: "Solo el superadmin resuelve impugnaciones." }, { status: 403 }) };
  }
  return { sesion };
}

export async function GET() {
  const { error } = await soloSuperadmin();
  if (error) return error;
  return Response.json({ pendientes: await contarPendientes() });
}

export async function POST(req: Request) {
  const { sesion, error } = await soloSuperadmin();
  if (error) return error;
  let body: { leadId?: unknown; aceptar?: unknown; respuesta?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (typeof body.leadId !== "string" || typeof body.aceptar !== "boolean") {
    return Response.json({ error: "leadId y aceptar son obligatorios" }, { status: 400 });
  }
  const r = await resolverImpugnacion(body.leadId, {
    aceptar: body.aceptar,
    respuesta: typeof body.respuesta === "string" ? body.respuesta : "",
    por: sesion.email,
  });
  return r.ok ? Response.json({ lead: r.lead }) : Response.json({ error: r.error }, { status: r.status });
}
