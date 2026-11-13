// Impugnaciones.
// GET: cuántas hay pendientes (superadmin) o sin revisar (admin).
// POST superadmin: decisión final. Body: { leadId, aceptar: boolean, respuesta? }
// POST admin: primera aprobación. Body: { leadId, revision: true, aprueba: boolean, comentario? }

import { obtenerSesion } from "@/lib/auth";
import { contarPendientes, contarSinRevisar, resolverImpugnacion, revisarImpugnacion } from "@/lib/impugnaciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role === "superadmin") return Response.json({ pendientes: await contarPendientes() });
  if (sesion.role === "admin") return Response.json({ pendientes: await contarSinRevisar() });
  return Response.json({ error: "No autorizado" }, { status: 403 });
}

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  let body: { leadId?: unknown; aceptar?: unknown; respuesta?: unknown; revision?: unknown; aprueba?: unknown; comentario?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (typeof body.leadId !== "string") {
    return Response.json({ error: "leadId es obligatorio" }, { status: 400 });
  }
  if (sesion.role === "admin") {
    if (body.revision !== true || typeof body.aprueba !== "boolean") {
      return Response.json({ error: "El administrador da la primera aprobación; la final es del superadmin." }, { status: 403 });
    }
    const r = await revisarImpugnacion(body.leadId, {
      aprueba: body.aprueba,
      comentario: typeof body.comentario === "string" ? body.comentario : "",
      por: sesion.email,
    });
    return r.ok ? Response.json({ lead: r.lead }) : Response.json({ error: r.error }, { status: r.status });
  }
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin resuelve impugnaciones." }, { status: 403 });
  }
  if (typeof body.aceptar !== "boolean") {
    return Response.json({ error: "aceptar es obligatorio" }, { status: 400 });
  }
  const r = await resolverImpugnacion(body.leadId, {
    aceptar: body.aceptar,
    respuesta: typeof body.respuesta === "string" ? body.respuesta : "",
    por: sesion.email,
  });
  return r.ok ? Response.json({ lead: r.lead }) : Response.json({ error: r.error }, { status: r.status });
}
