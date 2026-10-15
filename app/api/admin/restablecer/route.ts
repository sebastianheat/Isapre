// Fija la contraseña nueva con el token del correo. Body: { token, password }.

import { restablecerConToken } from "@/lib/recuperar-clave";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  try {
    await restablecerConToken(token, password);
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo cambiar la contraseña.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
