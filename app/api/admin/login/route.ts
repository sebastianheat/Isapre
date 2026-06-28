import { cookies } from "next/headers";
import { COOKIE_NAME, COOKIE_OPCIONES, signSession } from "@/lib/auth";
import { autenticar } from "@/lib/usuarios";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const email = (body.email || "").trim();
  const password = body.password || "";
  if (!email || !password) {
    return Response.json({ error: "Email y contraseña son obligatorios." }, { status: 400 });
  }

  try {
    const user = await autenticar(email, password);
    if (!user) {
      return Response.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
    }
    const token = await signSession({ email: user.email, role: user.role });
    const store = await cookies();
    store.set(COOKIE_NAME, token, COOKIE_OPCIONES);
    return Response.json({
      ok: true,
      user: {
        email: user.email,
        role: user.role,
        nombre: user.nombre,
        passwordEsSemilla: user.passwordEsSemilla,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error de servidor";
    console.error("Login error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
