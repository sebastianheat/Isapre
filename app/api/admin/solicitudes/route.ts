// Solicitudes del admin (pausar/reactivar vendedores).
// GET (superadmin y admin): pendientes y últimas resueltas.
// POST admin: pedir. Body: { tipo: "pausar"|"reactivar", email, motivo }
// POST superadmin: resolver. Body: { id, aprobar: boolean, respuesta? }

import { obtenerSesion } from "@/lib/auth";
import { crearSolicitud, listarPendientes, listarResueltas, resolverSolicitud } from "@/lib/solicitudes";
import { veTodo } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion || !veTodo(sesion.role)) return Response.json({ error: "No autorizado" }, { status: 401 });
  return Response.json({ pendientes: await listarPendientes(), resueltas: await listarResueltas() });
}

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (sesion.role === "admin") {
    const r = await crearSolicitud(sesion.email, body);
    return r.ok ? Response.json({ solicitud: r.solicitud }) : Response.json({ error: r.error }, { status: r.status });
  }
  if (sesion.role !== "superadmin") return Response.json({ error: "No autorizado" }, { status: 403 });
  if (typeof body.id !== "string" || typeof body.aprobar !== "boolean") {
    return Response.json({ error: "id y aprobar son obligatorios" }, { status: 400 });
  }
  const r = await resolverSolicitud(body.id, {
    aprobar: body.aprobar,
    respuesta: typeof body.respuesta === "string" ? body.respuesta : "",
    por: sesion.email,
  });
  return r.ok ? Response.json({ solicitud: r.solicitud }) : Response.json({ error: r.error }, { status: r.status });
}
