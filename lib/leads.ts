import { kvSet, kvGet, kvDel, kvZAdd, kvZRem, kvZRevRange, kvScanKeys } from "./store";
import { enviarLeadPorEmail } from "./email";

// Canal de origen del lead: cómo llegó el cliente. "google-ads" cuando hay
// gclid en la URL (vino de un anuncio), "web-organico" cuando no, y
// "whatsapp" cuando llegó por el bot de WhatsApp.
export type CanalLead = "google-ads" | "web-organico" | "whatsapp";

// Etapa del lead en el pipeline. Se puede mover manualmente desde el panel.
export type EtapaLead =
  | "nuevo"
  | "contactando"
  | "cotizado"
  | "pendiente"
  | "agendado"
  | "ganado"
  | "perdido";

export const ETAPAS: { id: EtapaLead; label: string; icon: string; color: string }[] = [
  { id: "nuevo",        label: "Nuevo",             icon: "🆕", color: "#3B82F6" },
  { id: "contactando",  label: "Contactando",       icon: "📞", color: "#F59E0B" },
  { id: "cotizado",     label: "Cotización enviada", icon: "📄", color: "#8B5CF6" },
  { id: "pendiente",    label: "Pendiente respuesta", icon: "⏳", color: "#EAB308" },
  { id: "agendado",     label: "Agendado",          icon: "📅", color: "#06B6D4" },
  { id: "ganado",       label: "Ganado ✓",          icon: "🏆", color: "#10B981" },
  { id: "perdido",      label: "Perdido",           icon: "✕",  color: "#EF4444" },
];

// Nota manual del ejecutivo sobre el lead (observaciones, resultados de
// llamada, etc.). Se muestran en orden cronológico en el detalle.
export interface NotaLead {
  id: string;
  texto: string;
  fecha: string; // ISO
  autor: string; // email del ejecutivo
}

// Recordatorio programado (ej. "llamar el 15 sep 10am"). El cron
// /api/cron/recordatorios revisa periódicamente los pendientes y notifica.
export interface RecordatorioLead {
  id: string;
  fecha: string; // ISO cuando debe dispararse
  mensaje: string;
  notificado: boolean;
  creadoPor: string; // email del ejecutivo
  creadoEn: string; // ISO
}

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
  // Fecha ISO, seteada al guardar (primera vez).
  fecha?: string;
  // Última actualización (se actualiza en cada upsert).
  actualizado?: string;
  // Cuántas veces el mismo cliente apareció (útil para ver si Titi lo buscó
  // varias veces, o si un mismo lead apareció por form y por chat).
  contactos?: number;
  // Pipeline / CRM manual.
  etapa?: EtapaLead;
  asignadoA?: string; // email del ejecutivo asignado
  notas?: NotaLead[];
  recordatorios?: RecordatorioLead[];
}

const INDEX_KEY = "leads:by-date";
const LEAD_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 días

// Índices secundarios para dedupe: mapean email/rut/telefono normalizado al ID.
function keyByEmail(email: string): string {
  return `lead:by-email:${email.trim().toLowerCase()}`;
}
function keyByRut(rut: string): string {
  // RUT sin puntos ni guion para matchear distintos formatos del mismo RUT.
  return `lead:by-rut:${rut.replace(/[.\-\s]/g, "").toLowerCase()}`;
}
function keyByTelefono(telefono: string): string {
  return `lead:by-telefono:+${telefono.replace(/[^0-9]/g, "").replace(/^56/, "56")}`;
}

function generarId(lead: Lead): string {
  // Único por canal + identificador del cliente + timestamp.
  const base = lead.telefono || lead.rut || "anon";
  return `lead:${base}:${Date.now()}`;
}

function inferirCanal(lead: Lead): CanalLead {
  if (lead.canal) return lead.canal;
  if (lead.gclid) return "google-ads";
  if (lead.origen === "whatsapp-chat") return "whatsapp";
  return "web-organico";
}

// Busca un lead existente por email, rut o telefono (en ese orden de prioridad
// — email es el más confiable). Devuelve el lead completo o null si es nuevo.
export async function buscarLeadExistente(
  query: { email?: string; rut?: string; telefono?: string },
): Promise<Lead | null> {
  const keys: string[] = [];
  if (query.email) keys.push(keyByEmail(query.email));
  if (query.rut) keys.push(keyByRut(query.rut));
  if (query.telefono) keys.push(keyByTelefono(query.telefono));

  for (const k of keys) {
    const id = await kvGet(k);
    if (id) {
      const l = await obtenerLead(id);
      if (l) return l;
    }
  }
  return null;
}

// Resultado del upsert: el lead final + si fue nuevo o ya existía.
export interface GuardarLeadResultado {
  lead: Lead;
  esNuevo: boolean;
}

// Guarda el lead haciendo UPSERT: si ya existe (por email/rut/telefono), lo
// actualiza con los datos nuevos (no destructivo — campos vacíos no pisan los
// que ya estaban). Solo si es nuevo: KV + HEAT + email + cuenta como conversión.
// Si es update: actualiza KV y manda email solo si cambiaron datos clave
// (para que el equipo vea actividad), pero no dispara conversión.
export async function guardarLead(lead: Lead): Promise<GuardarLeadResultado> {
  const existente = await buscarLeadExistente({
    email: lead.email,
    rut: lead.rut,
    telefono: lead.telefono,
  });

  if (existente) {
    // Update: mergea datos nuevos sin pisar datos antiguos válidos.
    return await mergearLead(existente, lead);
  } else {
    return await crearLead(lead);
  }
}

async function crearLead(lead: Lead): Promise<GuardarLeadResultado> {
  const fecha = new Date().toISOString();
  const id = generarId(lead);
  const canal = inferirCanal(lead);
  const registro: Lead = {
    ...lead,
    id,
    fecha,
    actualizado: fecha,
    canal,
    contactos: 1,
  };
  await kvSet(id, JSON.stringify(registro), LEAD_TTL_SECONDS);
  await kvZAdd(INDEX_KEY, Date.parse(fecha), id);
  // Índices secundarios para dedupe en próximas búsquedas.
  await guardarIndicesSecundarios(registro);
  console.log("LEAD nuevo:", JSON.stringify(registro));
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
  return { lead: registro, esNuevo: true };
}

async function mergearLead(existente: Lead, nuevo: Lead): Promise<GuardarLeadResultado> {
  // Mergeo no destructivo: los datos nuevos sobreescriben solo si no están vacíos.
  // contactos++ para llevar la cuenta de cuántas veces el mismo cliente apareció.
  const mergeado: Lead = {
    ...existente,
    nombre: nuevo.nombre || existente.nombre,
    rut: nuevo.rut || existente.rut,
    isapre: nuevo.isapre || existente.isapre,
    plan: nuevo.plan || existente.plan,
    region: nuevo.region || existente.region,
    telefono: nuevo.telefono || existente.telefono,
    email: nuevo.email || existente.email,
    edad: nuevo.edad ?? existente.edad,
    sueldoLiquido: nuevo.sueldoLiquido ?? existente.sueldoLiquido,
    previsionActual: nuevo.previsionActual || existente.previsionActual,
    cargasResumen: nuevo.cargasResumen || existente.cargasResumen,
    clinicaPreferida: nuevo.clinicaPreferida || existente.clinicaPreferida,
    gclid: nuevo.gclid || existente.gclid,
    actualizado: new Date().toISOString(),
    contactos: (existente.contactos || 1) + 1,
  };
  if (!existente.id) {
    console.error("Lead existente sin id, no se puede actualizar:", existente);
    return { lead: mergeado, esNuevo: false };
  }
  await kvSet(existente.id, JSON.stringify(mergeado), LEAD_TTL_SECONDS);
  await guardarIndicesSecundarios(mergeado);
  console.log("LEAD actualizado (contactos=" + mergeado.contactos + "):", JSON.stringify(mergeado));
  // NO mandamos email ni cuenta como conversión: ya es un cliente conocido.
  return { lead: mergeado, esNuevo: false };
}

async function guardarIndicesSecundarios(lead: Lead): Promise<void> {
  if (!lead.id) return;
  const ops: Promise<unknown>[] = [];
  if (lead.email) ops.push(kvSet(keyByEmail(lead.email), lead.id, LEAD_TTL_SECONDS));
  if (lead.rut) ops.push(kvSet(keyByRut(lead.rut), lead.id, LEAD_TTL_SECONDS));
  if (lead.telefono) ops.push(kvSet(keyByTelefono(lead.telefono), lead.id, LEAD_TTL_SECONDS));
  await Promise.all(ops).catch(() => {});
}

export async function obtenerLead(id: string): Promise<Lead | null> {
  const raw = await kvGet(id);
  return raw ? (JSON.parse(raw) as Lead) : null;
}

export async function eliminarLead(id: string): Promise<void> {
  const lead = await obtenerLead(id);
  await kvDel(id);
  await kvZRem(INDEX_KEY, id);
  // Limpia índices secundarios también.
  if (lead) {
    if (lead.email) await kvDel(keyByEmail(lead.email));
    if (lead.rut) await kvDel(keyByRut(lead.rut));
    if (lead.telefono) await kvDel(keyByTelefono(lead.telefono));
  }
}

export async function listarLeads(limit = 200): Promise<Lead[]> {
  // Fuente primaria: ZSET indexado por fecha. Si por algún motivo está vacío
  // (leads viejos sin index, escritura al ZSET falló, etc.), fallback a SCAN
  // de keys lead:* para no perder ningún lead.
  const idsFromIndex = await kvZRevRange(INDEX_KEY, 0, limit - 1);
  const ids = new Set<string>(idsFromIndex);

  if (ids.size < limit) {
    const scanned = await kvScanKeys("lead:*", limit * 2);
    // Filtramos los índices secundarios (lead:by-email/by-rut/by-telefono)
    // — solo nos interesan los leads "principales".
    for (const k of scanned) {
      if (!k.startsWith("lead:by-")) ids.add(k);
    }
  }

  const leads: Lead[] = [];
  for (const id of ids) {
    const l = await obtenerLead(id);
    if (l) leads.push(l);
  }
  // Re-curar el ZSET con cualquier lead que faltaba (reindex perezoso).
  for (const l of leads) {
    if (l.id && l.fecha && !idsFromIndex.includes(l.id)) {
      await kvZAdd(INDEX_KEY, Date.parse(l.fecha), l.id).catch(() => {});
    }
  }
  // Orden final: fecha desc.
  leads.sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
  return leads.slice(0, limit);
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

// ===== Pipeline / CRM manual =====

// Actualiza campos "editables" del lead desde el panel admin (etapa,
// asignadoA, nombre, etc.). NO toca las claves de índice ni el email
// hasheado. Devuelve el lead actualizado.
export async function actualizarLead(
  id: string,
  cambios: Partial<Pick<Lead, "etapa" | "asignadoA" | "nombre" | "isapre" | "plan">>,
): Promise<Lead | null> {
  const actual = await obtenerLead(id);
  if (!actual) return null;
  const merged: Lead = {
    ...actual,
    ...cambios,
    actualizado: new Date().toISOString(),
  };
  await kvSet(id, JSON.stringify(merged), LEAD_TTL_SECONDS);
  return merged;
}

function newId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export async function agregarNota(
  leadId: string,
  texto: string,
  autor: string,
): Promise<Lead | null> {
  const lead = await obtenerLead(leadId);
  if (!lead) return null;
  const nota: NotaLead = {
    id: newId(),
    texto: texto.trim(),
    fecha: new Date().toISOString(),
    autor,
  };
  const notas = [...(lead.notas ?? []), nota];
  const merged: Lead = { ...lead, notas, actualizado: nota.fecha };
  await kvSet(leadId, JSON.stringify(merged), LEAD_TTL_SECONDS);
  return merged;
}

export async function eliminarNota(leadId: string, notaId: string): Promise<Lead | null> {
  const lead = await obtenerLead(leadId);
  if (!lead) return null;
  const notas = (lead.notas ?? []).filter((n) => n.id !== notaId);
  const merged: Lead = { ...lead, notas, actualizado: new Date().toISOString() };
  await kvSet(leadId, JSON.stringify(merged), LEAD_TTL_SECONDS);
  return merged;
}

export async function agregarRecordatorio(
  leadId: string,
  fechaISO: string,
  mensaje: string,
  creadoPor: string,
): Promise<Lead | null> {
  const lead = await obtenerLead(leadId);
  if (!lead) return null;
  const rec: RecordatorioLead = {
    id: newId(),
    fecha: fechaISO,
    mensaje: mensaje.trim(),
    notificado: false,
    creadoPor,
    creadoEn: new Date().toISOString(),
  };
  const recordatorios = [...(lead.recordatorios ?? []), rec];
  const merged: Lead = { ...lead, recordatorios, actualizado: rec.creadoEn };
  await kvSet(leadId, JSON.stringify(merged), LEAD_TTL_SECONDS);
  return merged;
}

export async function eliminarRecordatorio(
  leadId: string,
  recId: string,
): Promise<Lead | null> {
  const lead = await obtenerLead(leadId);
  if (!lead) return null;
  const recordatorios = (lead.recordatorios ?? []).filter((r) => r.id !== recId);
  const merged: Lead = { ...lead, recordatorios, actualizado: new Date().toISOString() };
  await kvSet(leadId, JSON.stringify(merged), LEAD_TTL_SECONDS);
  return merged;
}

// Marca un recordatorio como notificado (lo usa el cron después de mandarlo).
export async function marcarRecordatorioNotificado(
  leadId: string,
  recId: string,
): Promise<void> {
  const lead = await obtenerLead(leadId);
  if (!lead) return;
  const recordatorios = (lead.recordatorios ?? []).map((r) =>
    r.id === recId ? { ...r, notificado: true } : r,
  );
  await kvSet(leadId, JSON.stringify({ ...lead, recordatorios }), LEAD_TTL_SECONDS);
}
