import { kvSet, kvGet, kvDel, kvZAdd, kvZRem, kvZRevRange } from "./store";
import { enviarLeadPorEmail } from "./email";

// Canal de origen del lead: cómo llegó el cliente. "google-ads" cuando hay
// gclid en la URL (vino de un anuncio), "web-organico" cuando no, y
// "whatsapp" cuando llegó por el bot de WhatsApp.
export type CanalLead = "google-ads" | "web-organico" | "whatsapp";

export interface Lead {
  id?: string; // se setea al guardar; clave única tipo "lead:..."
  nombre: string;
  rut: string;
  isapre?: string;
  plan?: string;
  region?: string;
  telefono?: string;
  email?: string;
  edad?: number;
  sueldoLiquido?: number;
  previsionActual?: string;
  cargasResumen?: string;
  clinicaPreferida?: string;
  origen?: string;
  // Canal y tracking de Google Ads.
  canal?: CanalLead;
  gclid?: string;
  // Fecha ISO, seteada al guardar.
  fecha?: string;
}

const INDEX_KEY = "leads:by-date";
const LEAD_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 días

function generarId(lead: Lead): string {
  // Único por canal + identificador del cliente + timestamp. Suma timestamp al
  // final para que múltiples leads del mismo cliente no se pisen.
  const base = lead.telefono || lead.rut || "anon";
  return `lead:${base}:${Date.now()}`;
}

function inferirCanal(lead: Lead): CanalLead {
  if (lead.canal) return lead.canal;
  if (lead.gclid) return "google-ads";
  if (lead.origen === "whatsapp-chat") return "whatsapp";
  return "web-organico";
}

// Guarda el lead en KV y, en paralelo, lo empuja a HEAT (CRM) y manda email
// a info@nuevaisapre.cl. Las 3 ramas son independientes: si una falla, las
// otras igual se ejecutan. KV es la fuente de verdad — HEAT y email son
// complementarios.
export async function guardarLead(lead: Lead): Promise<Lead> {
  const fecha = new Date().toISOString();
  const id = generarId(lead);
  const canal = inferirCanal(lead);
  const registro: Lead = { ...lead, id, fecha, canal };
  await kvSet(id, JSON.stringify(registro), LEAD_TTL_SECONDS);
  // Índice por fecha (score = ms epoch) para listar más reciente primero.
  await kvZAdd(INDEX_KEY, Date.parse(fecha), id);
  console.log("LEAD capturado:", JSON.stringify(registro));
  try {
    await pushToHeat(registro);
  } catch (e) {
    console.error("Push a HEAT falló:", e);
  }
  try {
    await enviarLeadPorEmail(registro);
  } catch (e) {
    console.error("Email del lead falló:", e);
  }
  return registro;
}

export async function obtenerLead(id: string): Promise<Lead | null> {
  const raw = await kvGet(id);
  return raw ? (JSON.parse(raw) as Lead) : null;
}

export async function eliminarLead(id: string): Promise<void> {
  await kvDel(id);
  await kvZRem(INDEX_KEY, id);
}

export async function listarLeads(limit = 200): Promise<Lead[]> {
  const ids = await kvZRevRange(INDEX_KEY, 0, limit - 1);
  const leads: Lead[] = [];
  for (const id of ids) {
    const l = await obtenerLead(id);
    if (l) leads.push(l);
  }
  return leads;
}

// Empuja el lead a HEAT/GoHighLevel: upsert de contacto + opportunity en el
// pipeline configurado. Requiere HEAT_API_KEY y HEAT_LOCATION_ID; si están
// HEAT_PIPELINE_ID + HEAT_STAGE_ID además crea la oportunidad en el pipeline.
async function pushToHeat(lead: Lead): Promise<void> {
  const apiKey = process.env.HEAT_API_KEY;
  const locationId = process.env.HEAT_LOCATION_ID;
  if (!apiKey || !locationId) return;

  const [firstName, ...rest] = (lead.nombre || "").trim().split(/\s+/);
  const res = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      locationId,
      firstName: firstName || lead.nombre,
      lastName: rest.join(" "),
      email: lead.email,
      phone: lead.telefono ? `+${lead.telefono.replace(/^\+/, "")}` : undefined,
      source: lead.origen ?? "Romina",
      tags: ["escalar_ejecutivo", "interesado", `canal:${lead.canal ?? "web-organico"}`],
      customFields: [
        { key: "rut", value: lead.rut },
        { key: "isapre_solicitada", value: lead.isapre ?? "" },
        { key: "plan_cotizado", value: lead.plan ?? "" },
        { key: "region", value: lead.region ?? "" },
        { key: "edad", value: lead.edad ? String(lead.edad) : "" },
        { key: "sueldo_liquido", value: lead.sueldoLiquido ? String(lead.sueldoLiquido) : "" },
        { key: "prevision_actual", value: lead.previsionActual ?? "" },
        { key: "cargas", value: lead.cargasResumen ?? "" },
        { key: "clinica_preferida", value: lead.clinicaPreferida ?? "" },
        { key: "canal", value: lead.canal ?? "" },
        { key: "gclid", value: lead.gclid ?? "" },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`HEAT ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { contact?: { id?: string } };
  const contactId = data.contact?.id;

  const pipelineId = process.env.HEAT_PIPELINE_ID;
  const stageId = process.env.HEAT_STAGE_ID;
  if (contactId && pipelineId && stageId) {
    try {
      await crearOportunidad(apiKey, locationId, pipelineId, stageId, contactId, lead);
    } catch (e) {
      console.error("Crear oportunidad en HEAT falló:", e);
    }
  }
}

// Crea una opportunity en el pipeline configurado, con LTV estimado
// (sueldo × 7% × 24 meses) y nombre legible para el ejecutivo.
async function crearOportunidad(
  apiKey: string,
  locationId: string,
  pipelineId: string,
  pipelineStageId: string,
  contactId: string,
  lead: Lead,
): Promise<void> {
  const monetaryValue = lead.sueldoLiquido
    ? Math.round(lead.sueldoLiquido * 0.07 * 24)
    : 0;
  const name = `Lead web — ${lead.nombre}${lead.isapre ? ` (${lead.isapre})` : ""}`;

  const res = await fetch("https://services.leadconnectorhq.com/opportunities/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pipelineId,
      locationId,
      name,
      pipelineStageId,
      status: "open",
      contactId,
      monetaryValue,
      source: lead.origen ?? "Romina",
    }),
  });
  if (!res.ok) {
    throw new Error(`HEAT opportunity ${res.status}: ${await res.text()}`);
  }
}
