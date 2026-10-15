import { obtenerSesion } from "@/lib/auth";
import { deleteUsuario, getUsuario, setRecibiendoLeads } from "@/lib/usuarios";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ email: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede eliminar usuarios." }, { status: 403 });
  }
  const { email } = await ctx.params;
  const target = decodeURIComponent(email).toLowerCase();
  if (target === sesion.email.toLowerCase()) {
    return Response.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });
  }
  const u = await getUsuario(target);
  if (!u) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
  await deleteUsuario(target);
  return Response.json({ ok: true });
}

// Interruptor "recibir leads" (US-007). El superadmin lo cambia a cualquiera;
// un ejecutivo solo el suyo. Body: { recibiendoLeads: boolean }
export async function PATCH(req: Request, ctx: { params: Promise<{ email: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { email } = await ctx.params;
  const target = decodeURIComponent(email).toLowerCase();
  if (sesion.role !== "superadmin" && target !== sesion.email.toLowerCase()) {
    return Response.json({ error: "Solo puedes cambiar tu propio estado." }, { status: 403 });
  }
  let body: { recibiendoLeads?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (typeof body.recibiendoLeads !== "boolean") {
    return Response.json({ error: "recibiendoLeads debe ser true o false" }, { status: 400 });
  }
  const usuario = await setRecibiendoLeads(target, body.recibiendoLeads);
  if (!usuario) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
  return Response.json({ usuario });
}
