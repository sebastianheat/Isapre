// Auth para el panel de ejecutivos: sesión JWT en httpOnly cookie + bcrypt.
// La sesión dura 7 días. ADMIN_SESSION_SECRET debe estar en env (string random).

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const COOKIE_NAME = "isapre_admin_session";
const SESSION_DAYS = 7;

function secret(): Uint8Array {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET falta o es muy corto (mínimo 32 chars). " +
      "Generar uno random y agregarlo a las env vars de Vercel.",
    );
  }
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  email: string;
  role: "superadmin" | "ejecutivo";
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.email !== "string") return null;
    const role = payload.role === "superadmin" ? "superadmin" : "ejecutivo";
    return { email: payload.email, role };
  } catch {
    return null;
  }
}

// Lee la sesión actual desde el cookie (en route handlers / server components).
export async function obtenerSesion(): Promise<SessionPayload | null> {
  const store = await cookies();
  const c = store.get(COOKIE_NAME);
  if (!c?.value) return null;
  return await verifySession(c.value);
}

// Lee la sesión desde una Request (para middleware o handlers que ya tienen el req).
export async function obtenerSesionDeReq(req: NextRequest): Promise<SessionPayload | null> {
  const c = req.cookies.get(COOKIE_NAME);
  if (!c?.value) return null;
  return await verifySession(c.value);
}

export const COOKIE_OPCIONES = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

// Hash + verify con bcrypt. cost=10 es el sweet spot (rápido en CI/Vercel, fuerte).
export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plain, hash);
}
