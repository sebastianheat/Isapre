// Regala créditos a un ejecutivo (solo superadmin). Body: { email, cantidad, motivo }

import { obtenerSesion } from "@/lib/auth";
import { getUsuario } from "@/lib/usuarios";
import { regalarCreditos } from "@/lib/credits-kv";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede regalar créditos." }, { status: 403 });
  }
  let body: { email?: unknown; cantidad?: unknown; motivo?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (typeof body.email !== "string" || !body.email.trim()) {
    return Response.json({ error: "Elige un ejecutivo" }, { status: 400 });
  }
  if (!(await getUsuario(body.email))) {
    return Response.json({ error: "El ejecutivo elegido no existe" }, { status: 400 });
  }
  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  if (!motivo) {
    return Response.json({ error: "Escribe un motivo para este movimiento", campo: "motivo" }, { status: 400 });
  }
  if (typeof body.cantidad !== "number" || !Number.isInteger(body.cantidad) || body.cantidad <= 0) {
    return Response.json({ error: "La cantidad debe ser un entero positivo", campo: "cantidad" }, { status: 400 });
  }
  const r = await regalarCreditos({
    email: body.email, cantidad: body.cantidad, motivo, por: sesion.email,
  });
  return Response.json({ saldo: r.saldo, movimiento: r.movimiento });
}
