// Crea ejecutivos en lote (solo superadmin). Body: { texto } con las filas
// pegadas desde Excel. Cada uno nace con la clave temporal y el cupo inicial.

import { obtenerSesion } from "@/lib/auth";
import { importarUsuarios, parsearFilas } from "@/lib/importar-usuarios";

export const runtime = "nodejs";

const MAX_FILAS = 200;

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede crear usuarios." }, { status: 403 });
  }
  let body: { texto?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  if (typeof body.texto !== "string" || !body.texto.trim()) {
    return Response.json({ error: "Pega la lista de usuarios." }, { status: 400 });
  }
  const filas = parsearFilas(body.texto);
  if (filas.length === 0) {
    return Response.json({ error: "No se encontró ningún correo en la lista." }, { status: 400 });
  }
  if (filas.length > MAX_FILAS) {
    return Response.json({ error: `Máximo ${MAX_FILAS} usuarios por importación.` }, { status: 400 });
  }
  const resultado = await importarUsuarios(filas, sesion.email);
  return Response.json(resultado);
}
