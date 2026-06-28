import { obtenerSesion } from "@/lib/auth";
import { obtenerLead, eliminarLead } from "@/lib/leads";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const lead = await obtenerLead(decodeURIComponent(id));
  if (!lead) return Response.json({ error: "Lead no encontrado" }, { status: 404 });
  return Response.json({ lead });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede eliminar leads." }, { status: 403 });
  }
  const { id } = await ctx.params;
  await eliminarLead(decodeURIComponent(id));
  return Response.json({ ok: true });
}
