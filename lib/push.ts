// Notificaciones push al celular (Web Push, sin app de tienda).
//
// Cada usuario puede tener varios dispositivos suscritos (celular, PC). La
// suscripción la entrega el navegador al activar las notificaciones en el
// panel y se guarda en KV. Para enviar se usan las claves VAPID de Vercel:
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT (mailto:...). Sin ellas
// no se envía nada (y nada falla).
//
// Android: funciona desde Chrome aunque no se instale. iPhone (iOS 16.4+):
// solo si el panel se agregó a la pantalla de inicio y se abre desde ahí.

import webpush, { type PushSubscription } from "web-push";
import { kvGet, kvSet } from "./store";
import { listarUsuarios } from "./usuarios";
import type { Rol } from "./roles";

const MAX_DISPOSITIVOS = 5;
const key = (email: string) => `push:${email.trim().toLowerCase()}`;

export interface AvisoPush {
  titulo: string;
  cuerpo: string;
  url?: string; // dónde abre el panel al tocarla
  tag?: string; // misma tag = reemplaza a la anterior en vez de apilarse
}

export function clavePublica(): string {
  return process.env.VAPID_PUBLIC_KEY || "";
}

function configurado(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@nuevaisapre.cl", pub, priv);
  return true;
}

export function esSuscripcionValida(x: unknown): x is PushSubscription {
  const s = x as PushSubscription;
  return (
    !!s && typeof s.endpoint === "string" && s.endpoint.startsWith("https://") &&
    typeof s.keys?.p256dh === "string" && typeof s.keys?.auth === "string"
  );
}

async function leer(email: string): Promise<PushSubscription[]> {
  const raw = await kvGet(key(email));
  return raw ? (JSON.parse(raw) as PushSubscription[]) : [];
}

export async function guardarSuscripcion(email: string, sub: PushSubscription): Promise<number> {
  const subs = (await leer(email)).filter((s) => s.endpoint !== sub.endpoint);
  const nuevas = [...subs, sub].slice(-MAX_DISPOSITIVOS);
  await kvSet(key(email), JSON.stringify(nuevas), 0);
  return nuevas.length;
}

export async function quitarSuscripcion(email: string, endpoint: string): Promise<void> {
  const subs = (await leer(email)).filter((s) => s.endpoint !== endpoint);
  await kvSet(key(email), JSON.stringify(subs), 0);
}

export async function tieneDispositivos(email: string): Promise<boolean> {
  return (await leer(email)).length > 0;
}

// Envía a todos los dispositivos del usuario. Borra los que ya no existen
// (el navegador responde 404/410 cuando la persona desactivó o desinstaló).
// Nunca lanza: una notificación no debe romper el flujo que la dispara.
export async function enviarPush(email: string, aviso: AvisoPush): Promise<number> {
  try {
    if (!configurado()) return 0;
    const subs = await leer(email);
    if (subs.length === 0) return 0;
    const payload = JSON.stringify(aviso);
    const vencidas: string[] = [];
    let enviados = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(s, payload, { TTL: 60 * 60 * 24 });
          enviados++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) vencidas.push(s.endpoint);
          else console.error("Push falló:", email, status ?? e);
        }
      }),
    );
    if (vencidas.length > 0) {
      const vigentes = subs.filter((s) => !vencidas.includes(s.endpoint));
      await kvSet(key(email), JSON.stringify(vigentes), 0);
    }
    return enviados;
  } catch (e) {
    console.error("Push falló:", email, e);
    return 0;
  }
}

// A todos los usuarios con alguno de esos roles (p. ej. aviso de pendientes).
export async function enviarPushARoles(roles: Rol[], aviso: AvisoPush, excepto?: string): Promise<void> {
  try {
    const usuarios = (await listarUsuarios()).filter(
      (u) => roles.includes(u.role) && u.email.toLowerCase() !== (excepto ?? "").toLowerCase(),
    );
    await Promise.all(usuarios.map((u) => enviarPush(u.email, aviso)));
  } catch (e) {
    console.error("Push a roles falló:", e);
  }
}
