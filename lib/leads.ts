import { kvSet } from "./store";

export interface Lead {
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
}

// Guarda el lead y, si HEAT está configurado, lo empuja al CRM para Cynthia.
export async function guardarLead(lead: Lead): Promise<void> {
  const registro = { ...lead, fecha: new Date().toISOString() };
  const id = `lead:${lead.telefono || lead.rut || Date.now()}`;
  await kvSet(id, JSON.stringify(registro), 60 * 60 * 24 * 60);
  console.log("LEAD capturado:", JSON.stringify(registro));
  try {
    await pushToHeat(lead);
  } catch (e) {
    console.error("Push a HEAT falló:", e);
  }
}

// Empuja el lead a HEAT/GoHighLevel (upsert de contacto + tag para Cynthia).
// Requiere HEAT_API_KEY y HEAT_LOCATION_ID; si no están, solo queda el log.
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
      tags: ["escalar_ejecutivo", "interesado"],
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
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`HEAT ${res.status}: ${await res.text()}`);
  }
}
