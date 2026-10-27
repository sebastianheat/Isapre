// Impugnar un lead falso (el ejecutivo asignado). Body: { motivos, comentario }.
// DELETE: retirar la impugnación pendiente (p. ej. si el cliente contestó).

import { obtenerSesion } from "@/lib/auth";
import { impugnarLead, retirarImpugnacion, type Resultado } from "@/lib/impugnaciones";

export const runtime = "nodejs";

function responder(r: Resultado) {
  return r.ok ? Response.json({ lead: r.lead }) : Response.json({ error: r.error }, { status: r.status });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  let body: { motivos?: unknown; comentario?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  return responder(await impugnarLead(decodeURIComponent(id), sesion.email, body));
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  return responder(await retirarImpugnacion(decodeURIComponent(id), sesion.email));
}
