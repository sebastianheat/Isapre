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
  // Interruptor "recibir leads" (US-007). Ausente = prendido: los usuarios
  // anteriores a la Fase 1 siguen apareciendo en el selector de reparto.
  recibiendoLeads?: boolean;
  rut?: string;
  telefono?: string;
  ultimoIngreso?: string; // ISO
  passwordCambiadaEn?: string; // ISO, cuando dejó la clave temporal
}

export interface UsuarioPublico {
  email: string;
  role: "superadmin" | "ejecutivo";
  nombre?: string;
  createdAt: string;
  passwordEsSemilla?: boolean;
  recibiendoLeads: boolean;
  rut?: string;
  telefono?: string;
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
    recibiendoLeads: recibeLeads(u),
    rut: u.rut,
    telefono: u.telefono,
  };
}

export function recibeLeads(u: Pick<Usuario, "recibiendoLeads">): boolean {
  return u.recibiendoLeads !== false;
}

// Prende/apaga el interruptor "recibir leads". Devuelve null si no existe el usuario.
export async function setRecibiendoLeads(
  email: string,
  recibiendoLeads: boolean,
): Promise<UsuarioPublico | null> {
  const u = await getUsuario(email);
  if (!u) return null;
  const actualizado: Usuario = { ...u, recibiendoLeads };
  await setUsuario(actualizado);
  return publicView(actualizado);
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
//
// Reset de emergencia: con ADMIN_SEED_FORCE=1 (env de Vercel — solo el dueño
// de la cuenta puede setearla), el login con las credenciales semilla
// SOBREESCRIBE la clave del superadmin aunque ya exista y ELIMINA todos los
// demás usuarios del panel. Sirve para recuperar acceso o dejar un solo
// usuario activo. Quitar el flag después de usarlo.
export async function autenticar(email: string, password: string): Promise<Usuario | null> {
  const e = normEmail(email);
  const seedForce = process.env.ADMIN_SEED_FORCE === "1";
  let u = await getUsuario(e);

  if (e === SEED_EMAIL && password === SEED_PASSWORD && (!u || seedForce)) {
    const passwordHash = await hashPassword(SEED_PASSWORD);
    u = {
      email: e,
      passwordHash,
      role: "superadmin",
      nombre: u?.nombre || "Super Admin",
      createdAt: u?.createdAt || new Date().toISOString(),
      // Toda clave semilla es temporal: el panel obliga a cambiarla.
      passwordEsSemilla: true,
    };
    await setUsuario(u);
    if (seedForce) {
      const otros = (await kvSMembers("users:index")).filter((x) => normEmail(x) !== e);
      for (const otro of otros) await deleteUsuario(otro);
      console.log(
        `[admin] Reset de emergencia: superadmin ${e} restablecido, ${otros.length} usuario(s) eliminados.`,
      );
    }
    return u;
  }

  if (!u) return null;
  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok) return null;
  const conIngreso: Usuario = { ...u, ultimoIngreso: new Date().toISOString() };
  await setUsuario(conIngreso).catch(() => {});
  return conIngreso;
}

// Clave con la que nacen los usuarios importados en lote. Es temporal: el
// panel obliga a cambiarla en el primer ingreso (passwordEsSemilla).
export const CLAVE_TEMPORAL = "123456";

// Toda clave puesta por el superadmin es temporal: el ejecutivo debe
// cambiarla al entrar por primera vez.
export async function crearUsuario(input: {
  email: string;
  password: string;
  role: "superadmin" | "ejecutivo";
  nombre?: string;
  rut?: string;
  telefono?: string;
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
    passwordEsSemilla: true,
    rut: input.rut?.trim() || undefined,
    telefono: input.telefono?.trim() || undefined,
  };
  await setUsuario(u);
  return publicView(u);
}

// Pone una clave nueva sin pedir la actual (link de recuperación por correo).
export async function restablecerPassword(email: string, passwordNueva: string): Promise<void> {
  const u = await getUsuario(email);
  if (!u) throw new Error("Usuario no existe.");
  if (!passwordNueva || passwordNueva.length < 6) {
    throw new Error("La contraseña nueva debe tener al menos 6 caracteres.");
  }
  if (passwordNueva === CLAVE_TEMPORAL) {
    throw new Error("Elige una contraseña distinta a la temporal.");
  }
  u.passwordHash = await hashPassword(passwordNueva);
  u.passwordEsSemilla = false;
  u.passwordCambiadaEn = new Date().toISOString();
  await setUsuario(u);
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
  if (passwordNueva === passwordActual) {
    throw new Error("La contraseña nueva debe ser distinta a la actual.");
  }
  u.passwordHash = await hashPassword(passwordNueva);
  u.passwordEsSemilla = false;
  u.passwordCambiadaEn = new Date().toISOString();
  await setUsuario(u);
}

export { publicView };
