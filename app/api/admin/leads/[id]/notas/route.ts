import { obtenerSesion } from "@/lib/auth";
import { agregarNota, eliminarNota, obtenerLead } from "@/lib/leads";
import { puedeVerLead } from "@/lib/acceso";

export const runtime = "nodejs";

async function accesoDenegado(sesion: NonNullable<Awaited<ReturnType<typeof obtenerSesion>>>, id: string) {
  const lead = await obtenerLead(decodeURIComponent(id));
  return !lead || !puedeVerLead(sesion, lead);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (await accesoDenegado(sesion, id)) {
    return Response.json({ error: "Lead no encontrado" }, { status: 404 });
  }
  let body: { texto?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const texto = (body.texto || "").trim();
  if (!texto) return Response.json({ error: "Nota vacía" }, { status: 400 });
  const lead = await agregarNota(decodeURIComponent(id), texto, sesion.email);
  if (!lead) return Response.json({ error: "Lead no encontrado" }, { status: 404 });
  return Response.json({ lead });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (await accesoDenegado(sesion, id)) {
    return Response.json({ error: "Lead no encontrado" }, { status: 404 });
  }
  const url = new URL(req.url);
  const notaId = url.searchParams.get("notaId");
  if (!notaId) return Response.json({ error: "Falta notaId" }, { status: 400 });
  const lead = await eliminarNota(decodeURIComponent(id), notaId);
  if (!lead) return Response.json({ error: "Lead no encontrado" }, { status: 404 });
  return Response.json({ lead });
}
