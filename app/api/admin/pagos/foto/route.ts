// Foto del plan aceptado de un registro de pago (?id=). La ve el vendedor
// que lo subió, el admin y el superadmin.

import { obtenerSesion } from "@/lib/auth";
import { fotoDePago } from "@/lib/planes-pagados";
import { veTodo } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return new Response("No autorizado", { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const r = await fotoDePago(id);
  if (!r || (r.pago.email !== sesion.email.toLowerCase() && !veTodo(sesion.role))) {
    return new Response("No encontrado", { status: 404 });
  }
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.*)$/.exec(r.foto);
  if (!m) return new Response("No encontrado", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=3600" },
  });
}
