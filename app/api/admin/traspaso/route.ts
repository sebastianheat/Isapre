// Traspaso al jefe de equipo (superadmin, o el equipo técnico con token).
// GET: vista previa (qué leads pasarían). POST: hace el traspaso.

import { obtenerSesion } from "@/lib/auth";
import { autorizadoPorToken } from "@/lib/token-operacion";
import { candidatosTraspaso, jefeDeEquipo, traspasarCandidatos } from "@/lib/traspaso";
import type { Lead } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function autorizado(req: Request): Promise<string | null> {
  if (autorizadoPorToken(req)) return "operacion";
  const s = await obtenerSesion();
  return s?.role === "superadmin" ? s.email : null;
}

const resumen = (l: Lead) => ({
  id: l.id,
  nombre: l.nombre,
  fecha: l.fecha,
  asignadoA: l.asignadoA ?? null,
  etapa: l.etapa ?? "nuevo",
});

export async function GET(req: Request) {
  if (!(await autorizado(req))) return Response.json({ error: "No autorizado" }, { status: 401 });
  const jefe = await jefeDeEquipo();
  if (!jefe) return Response.json({ error: "No hay un administrador (jefe de equipo)." }, { status: 400 });
  const c = await candidatosTraspaso(jefe.email);
  return Response.json({ jefe, sinDueno: c.sinDueno.map(resumen), impugnados: c.impugnados.map(resumen) });
}

export async function POST(req: Request) {
  const por = await autorizado(req);
  if (!por) return Response.json({ error: "No autorizado" }, { status: 401 });
  const jefe = await jefeDeEquipo();
  if (!jefe) return Response.json({ error: "No hay un administrador (jefe de equipo)." }, { status: 400 });
  return Response.json({ jefe, ...(await traspasarCandidatos(jefe.email, por)) });
}
