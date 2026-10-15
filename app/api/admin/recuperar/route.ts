// Pide un link de recuperación de contraseña. Body: { email }. Responde
// siempre igual, exista o no la cuenta, para no revelar qué emails existen.

import { solicitarRecuperacion } from "@/lib/recuperar-clave";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) return Response.json({ error: "Escribe tu email." }, { status: 400 });
  try {
    await solicitarRecuperacion(email);
  } catch (e) {
    console.error("Recuperación de clave falló:", e instanceof Error ? e.message : e);
  }
  return Response.json({ ok: true });
}
