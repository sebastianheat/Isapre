import { obtenerSesion } from "@/lib/auth";
import { listarUsuarios, crearUsuario } from "@/lib/usuarios";

export const runtime = "nodejs";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede ver usuarios." }, { status: 403 });
  }
  const usuarios = await listarUsuarios();
  return Response.json({ usuarios });
}

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede crear usuarios." }, { status: 403 });
  }
  let body: { email?: string; password?: string; role?: string; nombre?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const email = (body.email || "").trim();
  const password = body.password || "";
  const role = body.role === "superadmin" ? "superadmin" : "ejecutivo";
  if (!email || !password) {
    return Response.json({ error: "Email y contraseña son obligatorios." }, { status: 400 });
  }
  try {
    const u = await crearUsuario({ email, password, role, nombre: body.nombre });
    return Response.json({ usuario: u });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear el usuario.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
