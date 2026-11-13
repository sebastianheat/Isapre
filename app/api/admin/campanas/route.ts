// Nombre de una campaña de Google Ads (solo superadmin). Body: { id, nombre }
// (nombre vacío lo borra).

import { obtenerSesion } from "@/lib/auth";
import { guardarNombreCampana } from "@/lib/campanas-nombres";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") return Response.json({ error: "Solo el superadmin." }, { status: 403 });
  let body: { id?: unknown; nombre?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (typeof body.id !== "string" || typeof body.nombre !== "string") {
    return Response.json({ error: "id y nombre son obligatorios" }, { status: 400 });
  }
  try {
    return Response.json({ nombres: await guardarNombreCampana(body.id, body.nombre) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "No se pudo guardar" }, { status: 400 });
  }
}
