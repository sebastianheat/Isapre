import { obtenerSesion } from "@/lib/auth";
import { deleteUsuario, getUsuario } from "@/lib/usuarios";

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
