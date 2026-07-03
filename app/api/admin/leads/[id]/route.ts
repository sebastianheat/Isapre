import { obtenerSesion } from "@/lib/auth";
import { obtenerLead, eliminarLead, actualizarLead, type EtapaLead } from "@/lib/leads";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const lead = await obtenerLead(decodeURIComponent(id));
  if (!lead) return Response.json({ error: "Lead no encontrado" }, { status: 404 });
  return Response.json({ lead });
}

// Actualiza etapa y/o asignadoA de un lead (movimiento de pipeline).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  let body: { etapa?: string; asignadoA?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const cambios: Parameters<typeof actualizarLead>[1] = {};
  const etapasValidas: EtapaLead[] = [
    "nuevo", "contactando", "cotizado", "pendiente", "agendado", "ganado", "perdido",
  ];
  if (body.etapa && etapasValidas.includes(body.etapa as EtapaLead)) {
    cambios.etapa = body.etapa as EtapaLead;
  }
  if (typeof body.asignadoA !== "undefined") {
    cambios.asignadoA = body.asignadoA?.toString().trim() || undefined;
  }
  const lead = await actualizarLead(decodeURIComponent(id), cambios);
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
