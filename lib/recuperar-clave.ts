// Recuperación de contraseña por correo. El token viaja solo en el link; en
// KV guardamos su hash (sha256) apuntando al email, con vencimiento de 1 hora
// y uso único.

import { createHash, randomBytes } from "node:crypto";
import { kvDel, kvGet, kvMarcarUnaVez, kvSet } from "./store";
import { getUsuario, restablecerPassword } from "./usuarios";
import { enviarRecuperacionClave } from "./email";

const TOKEN_TTL_SECONDS = 3600;
const ESPERA_ENTRE_ENVIOS_SECONDS = 60;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const keyToken = (token: string) => `reset:${hash(token)}`;

function sitio(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nuevaisapre.cl").replace(/\/$/, "");
}

// No revela si el email existe: el que llama siempre responde lo mismo.
export async function solicitarRecuperacion(email: string): Promise<void> {
  const u = await getUsuario(email);
  if (!u) return;
  if (!(await kvMarcarUnaVez(`reset:espera:${u.email}`, ESPERA_ENTRE_ENVIOS_SECONDS))) return;
  const token = randomBytes(32).toString("hex");
  await kvSet(keyToken(token), u.email, TOKEN_TTL_SECONDS);
  const link = `${sitio()}/admin/restablecer?token=${token}`;
  await enviarRecuperacionClave(u.email, u.nombre, link);
}

export async function tokenValido(token: string): Promise<boolean> {
  return !!token && !!(await kvGet(keyToken(token)));
}

export async function restablecerConToken(token: string, passwordNueva: string): Promise<string> {
  const email = token ? await kvGet(keyToken(token)) : null;
  if (!email) throw new Error("El link venció o ya fue usado. Pide uno nuevo.");
  await restablecerPassword(email, passwordNueva);
  await kvDel(keyToken(token));
  return email;
}
