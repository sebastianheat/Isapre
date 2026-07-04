// Webhook de Meta Lead Ads (formularios instantáneos de Facebook/Instagram).
//
// GET  → verificación del webhook (hub.challenge), igual que el de WhatsApp.
// POST → Meta avisa cada lead nuevo (field "leadgen"); buscamos el detalle
//        vía Graph API y lo guardamos DIRECTO en el panel (KV + email a
//        info@), SIN pasar por HEAT (omitirHeat) para no duplicar con la
//        sincronización propia de GHL.
//
// Env vars:
//   META_LEADS_VERIFY_TOKEN  token de verificación (elegido por nosotros)
//   META_PAGE_ACCESS_TOKEN   Page Access Token con leads_retrieval
//
// Setup completo en docs: google-ads/../docs? → ver meta-lead-ads-setup.md

import { waitUntil } from "@vercel/functions";
import { guardarLead, type Lead } from "@/lib/leads";
import { kvMarcarUnaVez } from "@/lib/store";
import { agregarNota } from "@/lib/leads";

export const runtime = "nodejs";
export const maxDuration = 30;

const VERIFY_TOKEN = process.env.META_LEADS_VERIFY_TOKEN || "nuevaisapre-meta-2026";
const GRAPH = "https://graph.facebook.com/v21.0";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

interface LeadgenValue {
  leadgen_id?: string;
  page_id?: string;
  form_id?: string;
  created_time?: number;
}

export async function POST(req: Request) {
  let body: {
    object?: string;
    entry?: { changes?: { field?: string; value?: LeadgenValue }[] }[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: true }); // 200 igual: Meta reintenta si no
  }

  const eventos: LeadgenValue[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === "leadgen" && change.value?.leadgen_id) {
        eventos.push(change.value);
      }
    }
  }

  // Ack inmediato — el fetch a Graph corre en background (mismo patrón que
  // el webhook de WhatsApp; Meta deshabilita webhooks lentos).
  for (const ev of eventos) {
    waitUntil(procesarLeadgen(ev));
  }
  return Response.json({ ok: true, recibidos: eventos.length });
}

async function procesarLeadgen(ev: LeadgenValue): Promise<void> {
  try {
    const id = ev.leadgen_id!;
    // Dedupe de reintentos del webhook.
    const esNuevoEvento = await kvMarcarUnaVez(`metalead:${id}`, 60 * 60 * 24 * 7);
    if (!esNuevoEvento) return;

    const token = process.env.META_PAGE_ACCESS_TOKEN;
    if (!token) {
      console.error("META_PAGE_ACCESS_TOKEN no configurado; lead de Meta NO procesado:", id);
      return;
    }

    const res = await fetch(
      `${GRAPH}/${id}?fields=field_data,created_time,form_id,ad_id,ad_name,campaign_name&access_token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) {
      console.error(`Graph API ${res.status} para lead ${id}:`, await res.text());
      return;
    }
    const data = (await res.json()) as {
      field_data?: { name?: string; values?: string[] }[];
      ad_name?: string;
      campaign_name?: string;
    };

    const { lead, extras } = mapearCampos(data.field_data ?? []);
    lead.metaLeadId = id;
    lead.canal = "meta-ads";
    lead.origen = "meta-leadform";

    // Directo al panel + email a info@. SIN HEAT (lo pidió Sebastián: GHL ya
    // tiene su propia sincronización de formularios de Meta).
    const r = await guardarLead(lead, { omitirHeat: true });

    // Todo lo que el form traía y no mapeamos, más el nombre del anuncio,
    // queda como nota para no perder información.
    const notaPartes = [
      data.campaign_name ? `Campaña: ${data.campaign_name}` : null,
      data.ad_name ? `Anuncio: ${data.ad_name}` : null,
      ...extras.map(([k, v]) => `${k}: ${v}`),
    ].filter(Boolean);
    if (r.lead.id && notaPartes.length > 0) {
      await agregarNota(r.lead.id, `📘 Meta Lead Ad\n${notaPartes.join("\n")}`, "meta-webhook");
    }
    console.log(`Meta lead ${id} guardado (${r.esNuevo ? "nuevo" : "actualizado"}):`, lead.nombre);
  } catch (e) {
    console.error("Error procesando leadgen:", e);
  }
}

// Mapea los field_data del formulario de Meta a nuestro Lead. Los nombres de
// campo varían según cómo se armó el form (inglés, español, custom), así que
// matcheamos por palabras clave. Lo no reconocido va a "extras" (→ nota).
function mapearCampos(
  fieldData: { name?: string; values?: string[] }[],
): { lead: Lead; extras: [string, string][] } {
  const lead: Lead = { nombre: "", rut: "" };
  const extras: [string, string][] = [];

  for (const f of fieldData) {
    const key = (f.name ?? "").toLowerCase();
    const valor = (f.values ?? []).join(", ").trim();
    if (!valor) continue;

    if (/full.?name|nombre/.test(key) && !/empresa|company/.test(key)) {
      lead.nombre = valor;
    } else if (/e.?mail|correo/.test(key)) {
      lead.email = valor.toLowerCase();
    } else if (/phone|tel[eé]fono|celular|whatsapp|n[uú]mero/.test(key)) {
      lead.telefono = valor.replace(/\s/g, "");
    } else if (/\brut\b|dni/.test(key)) {
      lead.rut = valor;
    } else if (/regi[oó]n|ciudad|comuna|city/.test(key)) {
      lead.region = valor;
    } else if (/edad|age|fecha.?de.?nacimiento|birth/.test(key)) {
      const n = parseInt(valor.replace(/\D/g, ""), 10);
      if (!isNaN(n) && n >= 18 && n <= 110) lead.edad = n;
      else extras.push([f.name ?? key, valor]);
    } else if (/sueldo|renta|ingreso|salar/.test(key)) {
      const n = parseInt(valor.replace(/\D/g, ""), 10);
      if (!isNaN(n) && n > 0) lead.sueldoLiquido = n;
      else extras.push([f.name ?? key, valor]);
    } else if (/previsi[oó]n|isapre.?actual|fonasa/.test(key)) {
      lead.previsionActual = valor;
    } else if (/cl[ií]nica|prestador|hospital/.test(key)) {
      lead.clinicaPreferida = valor;
    } else if (/carga|hijo|familia/.test(key)) {
      lead.cargasResumen = valor;
    } else {
      extras.push([f.name ?? key, valor]);
    }
  }

  if (!lead.nombre) lead.nombre = "Lead Meta (sin nombre)";
  return { lead, extras };
}
