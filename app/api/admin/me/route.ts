import { obtenerSesion } from "@/lib/auth";
import { getUsuario } from "@/lib/usuarios";

export const runtime = "nodejs";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ user: null }, { status: 401 });
  const u = await getUsuario(sesion.email);
  if (!u) return Response.json({ user: null }, { status: 401 });
  return Response.json({
    user: {
      email: u.email,
      role: u.role,
      nombre: u.nombre,
      passwordEsSemilla: u.passwordEsSemilla,
    },
  });
}
