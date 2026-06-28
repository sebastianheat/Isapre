// CRUD de usuarios del panel admin. Los usuarios viven en KV con clave
// `user:${emailLower}` y se indexan en el set `users:index` para listar.
//
// Seed: en el primer login, si el email coincide con ADMIN_SEED_EMAIL y no
// existe usuario aún, lo creamos como superadmin con ADMIN_SEED_PASSWORD.
// Eso permite que el sistema arranque listo sin scripts de bootstrap.

import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from "./store";
import { hashPassword, verifyPassword } from "./auth";

export interface Usuario {
  email: string;
  passwordHash: string;
  role: "superadmin" | "ejecutivo";
  nombre?: string;
  createdAt: string;
  passwordEsSemilla?: boolean;
}

export interface UsuarioPublico {
  email: string;
  role: "superadmin" | "ejecutivo";
  nombre?: string;
  createdAt: string;
  passwordEsSemilla?: boolean;
}

const SEED_EMAIL = (process.env.ADMIN_SEED_EMAIL || "info@nuevaisapre.cl").toLowerCase();
const SEED_PASSWORD = process.env.ADMIN_SEED_PASSWORD || "123456";

function normEmail(e: string): string {
  return e.trim().toLowerCase();
}

function publicView(u: Usuario): UsuarioPublico {
  return {
    email: u.email,
    role: u.role,
    nombre: u.nombre,
    createdAt: u.createdAt,
    passwordEsSemilla: u.passwordEsSemilla,
  };
}

export async function getUsuario(email: string): Promise<Usuario | null> {
  const raw = await kvGet(`user:${normEmail(email)}`);
  return raw ? (JSON.parse(raw) as Usuario) : null;
}

export async function setUsuario(u: Usuario): Promise<void> {
  const email = normEmail(u.email);
  await kvSet(`user:${email}`, JSON.stringify({ ...u, email }), 0);
  await kvSAdd("users:index", email);
}

export async function deleteUsuario(email: string): Promise<void> {
  const e = normEmail(email);
  await kvDel(`user:${e}`);
  await kvSRem("users:index", e);
}

export async function listarUsuarios(): Promise<UsuarioPublico[]> {
  const emails = await kvSMembers("users:index");
  const usuarios: UsuarioPublico[] = [];
  for (const email of emails) {
    const u = await getUsuario(email);
    if (u) usuarios.push(publicView(u));
  }
  // Más recientes primero.
  return usuarios.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Devuelve el usuario si las credenciales son válidas. Si es la primera vez
// que alguien intenta con el email semilla y la password semilla y no hay
// usuario aún, lo crea como superadmin (seed lazy).
export async function autenticar(email: string, password: string): Promise<Usuario | null> {
  const e = normEmail(email);
  let u = await getUsuario(e);

  if (!u && e === SEED_EMAIL && password === SEED_PASSWORD) {
    const passwordHash = await hashPassword(SEED_PASSWORD);
    u = {
      email: e,
      passwordHash,
      role: "superadmin",
      nombre: "Super Admin",
      createdAt: new Date().toISOString(),
      passwordEsSemilla: true,
    };
    await setUsuario(u);
    return u;
  }

  if (!u) return null;
  const ok = await verifyPassword(password, u.passwordHash);
  return ok ? u : null;
}

export async function crearUsuario(input: {
  email: string;
  password: string;
  role: "superadmin" | "ejecutivo";
  nombre?: string;
}): Promise<UsuarioPublico> {
  const e = normEmail(input.email);
  if (await getUsuario(e)) throw new Error("Ya existe un usuario con ese email.");
  if (!input.password || input.password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }
  const u: Usuario = {
    email: e,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    nombre: input.nombre?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  await setUsuario(u);
  return publicView(u);
}

export async function cambiarPassword(
  email: string,
  passwordActual: string,
  passwordNueva: string,
): Promise<void> {
  const u = await getUsuario(email);
  if (!u) throw new Error("Usuario no existe.");
  const ok = await verifyPassword(passwordActual, u.passwordHash);
  if (!ok) throw new Error("La contraseña actual no es correcta.");
  if (!passwordNueva || passwordNueva.length < 6) {
    throw new Error("La contraseña nueva debe tener al menos 6 caracteres.");
  }
  u.passwordHash = await hashPassword(passwordNueva);
  u.passwordEsSemilla = false;
  await setUsuario(u);
}

export { publicView };
