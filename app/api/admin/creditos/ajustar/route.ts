// Deja el saldo de un ejecutivo en un número exacto (conciliación). Solo
// superadmin. Body: { email, saldo, motivo }. Queda como "Ajuste" en su historial.

import { obtenerSesion } from "@/lib/auth";
import { ajustarSaldo } from "@/lib/credits-kv";
import { getUsuario } from "@/lib/usuarios";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede ajustar créditos." }, { status: 403 });
  }
  let body: { email?: unknown; saldo?: unknown; motivo?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !(await getUsuario(email))) {
    return Response.json({ error: "Ese ejecutivo no existe" }, { status: 400 });
  }
  try {
    const r = await ajustarSaldo({
      email,
      saldo: Number(body.saldo),
      motivo: typeof body.motivo === "string" ? body.motivo : "",
      por: sesion.email,
    });
    return Response.json({ saldo: r.saldo });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "No se pudo ajustar" }, { status: 400 });
  }
}
