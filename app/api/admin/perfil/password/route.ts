import { obtenerSesion } from "@/lib/auth";
import { cambiarPassword } from "@/lib/usuarios";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  let body: { passwordActual?: string; passwordNueva?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const actual = body.passwordActual || "";
  const nueva = body.passwordNueva || "";
  if (!actual || !nueva) {
    return Response.json({ error: "Falta contraseña actual o nueva." }, { status: 400 });
  }
  try {
    await cambiarPassword(sesion.email, actual, nueva);
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al cambiar la contraseña.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
