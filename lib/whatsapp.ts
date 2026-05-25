import { kvGet, kvSet } from "./store";
import type { ChatMessage } from "./agent";

const TOKEN = process.env.WHATSAPP_TOKEN || "";
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const GRAPH = "https://graph.facebook.com/v21.0";

// Envía un mensaje de texto por WhatsApp Cloud API.
export async function enviarWhatsApp(to: string, body: string): Promise<void> {
  if (!TOKEN || !PHONE_ID) {
    console.error("WhatsApp no configurado (faltan WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)");
    return;
  }
  const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: true, body: body.slice(0, 4000) },
    }),
  });
  if (!res.ok) console.error("WhatsApp send error", res.status, await res.text());
}

const MAX_TURNOS = 24;

export async function getHistorial(phone: string): Promise<ChatMessage[]> {
  const raw = await kvGet(`conv:${phone}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

export async function guardarHistorial(phone: string, msgs: ChatMessage[]): Promise<void> {
  await kvSet(`conv:${phone}`, JSON.stringify(msgs.slice(-MAX_TURNOS)), 60 * 60 * 24 * 3);
}
