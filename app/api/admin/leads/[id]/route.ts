import { obtenerSesion } from "@/lib/auth";
import {
  obtenerLead,
  eliminarLead,
  actualizarLead,
  type EtapaLead,
  type CalidadLead,
} from "@/lib/leads";

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
  let body: {
    etapa?: string;
    asignadoA?: string | null;
    calidad?: string;
    nombre?: string;
    telefono?: string;
    email?: string;
    rut?: string;
    region?: string;
    edad?: number;
    sueldoLiquido?: number;
    previsionActual?: string;
    clinicaPreferida?: string;
    cargasResumen?: string;
  };
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
  const calidadesValidas: CalidadLead[] = ["calificado", "marginal", "no_calificado"];
  if (body.calidad && calidadesValidas.includes(body.calidad as CalidadLead)) {
    cambios.calidad = body.calidad as CalidadLead;
  }
  // Datos editables del cliente (formulario "Editar datos" del panel).
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  if (str(body.nombre)) cambios.nombre = str(body.nombre);
  if (str(body.telefono)) cambios.telefono = str(body.telefono);
  if (str(body.email)) cambios.email = str(body.email)!.toLowerCase();
  if (str(body.rut)) cambios.rut = str(body.rut);
  if (str(body.region)) cambios.region = str(body.region);
  if (str(body.previsionActual)) cambios.previsionActual = str(body.previsionActual);
  if (str(body.clinicaPreferida)) cambios.clinicaPreferida = str(body.clinicaPreferida);
  if (str(body.cargasResumen)) cambios.cargasResumen = str(body.cargasResumen);
  if (typeof body.edad === "number" && body.edad >= 18 && body.edad <= 110) {
    cambios.edad = Math.round(body.edad);
  }
  if (typeof body.sueldoLiquido === "number" && body.sueldoLiquido >= 0) {
    cambios.sueldoLiquido = Math.round(body.sueldoLiquido);
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
