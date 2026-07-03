import { obtenerSesion } from "@/lib/auth";
import { agregarRecordatorio, eliminarRecordatorio } from "@/lib/leads";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  let body: { fecha?: string; mensaje?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const fecha = (body.fecha || "").trim();
  const mensaje = (body.mensaje || "").trim();
  if (!fecha || !mensaje) {
    return Response.json({ error: "Fecha y mensaje son obligatorios" }, { status: 400 });
  }
  // Validación básica de fecha
  const parsed = Date.parse(fecha);
  if (isNaN(parsed)) {
    return Response.json({ error: "Fecha inválida" }, { status: 400 });
  }
  const lead = await agregarRecordatorio(
    decodeURIComponent(id),
    new Date(parsed).toISOString(),
    mensaje,
    sesion.email,
  );
  if (!lead) return Response.json({ error: "Lead no encontrado" }, { status: 404 });
  return Response.json({ lead });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const recId = url.searchParams.get("recId");
  if (!recId) return Response.json({ error: "Falta recId" }, { status: 400 });
  const lead = await eliminarRecordatorio(decodeURIComponent(id), recId);
  if (!lead) return Response.json({ error: "Lead no encontrado" }, { status: 404 });
  return Response.json({ lead });
}
