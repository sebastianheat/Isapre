import { obtenerSesion } from "@/lib/auth";
import { listarUsuarios, crearUsuario } from "@/lib/usuarios";
import { regalarCreditos } from "@/lib/credits-kv";
import { CUPO_INICIAL } from "@/lib/importar-usuarios";
import { normalizarRol, vende } from "@/lib/roles";
import { autorizadoPorToken } from "@/lib/token-operacion";

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
  // Superadmin con sesión, o el equipo técnico con token de operación.
  const sesion = autorizadoPorToken(req) ? { email: "operacion", role: "superadmin" as const } : await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede crear usuarios." }, { status: 403 });
  }
  let body: { email?: string; password?: string; role?: string; nombre?: string; telefono?: string; rut?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const email = (body.email || "").trim();
  const password = body.password || "";
  const role = normalizarRol(body.role);
  if (!email || !password) {
    return Response.json({ error: "Email y contraseña son obligatorios." }, { status: 400 });
  }
  try {
    const u = await crearUsuario({ email, password, role, nombre: body.nombre, telefono: body.telefono, rut: body.rut });
    // Mismo cupo que la importación en lote: sin créditos no entra a la rueda.
    if (vende(role)) {
      await regalarCreditos({
        email: u.email, cantidad: CUPO_INICIAL, motivo: `Cupo inicial de ${CUPO_INICIAL} leads`, por: sesion.email,
      });
    }
    return Response.json({ usuario: u });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear el usuario.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
