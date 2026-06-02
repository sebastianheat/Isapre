import { guardarLead, type Lead } from "@/lib/leads";
import { enviarLeadPorEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 15;

interface FormPayload {
  nombre?: string;
  rut?: string;
  telefono?: string;
  email?: string;
  region?: string;
  edad?: number;
  sueldo_liquido?: number;
  prevision_actual?: string;
  cargas_cantidad?: number;
  cargas_edades?: string;
  clinica_preferida?: string;
  origen?: string;
}

export async function POST(req: Request) {
  let body: FormPayload;
  try {
    body = (await req.json()) as FormPayload;
  } catch {
    return Response.json({ ok: false, error: "Cuerpo inválido." }, { status: 400 });
  }

  const nombre = (body.nombre || "").trim();
  const rut = (body.rut || "").trim();
  const telefono = (body.telefono || "").trim();
  const email = (body.email || "").trim();
  if (!nombre || !rut || !telefono || !email) {
    return Response.json(
      { ok: false, error: "Faltan nombre, RUT, teléfono o email." },
      { status: 400 },
    );
  }

  const cargasResumen =
    body.cargas_cantidad && body.cargas_cantidad > 0
      ? `${body.cargas_cantidad} carga(s)${body.cargas_edades ? ` — edades: ${body.cargas_edades}` : ""}`
      : "";

  const lead: Lead = {
    nombre,
    rut,
    telefono,
    email,
    region: body.region,
    edad: body.edad,
    sueldoLiquido: body.sueldo_liquido,
    previsionActual: body.prevision_actual,
    cargasResumen,
    clinicaPreferida: body.clinica_preferida,
    origen: body.origen ?? "landing-form",
  };

  try {
    await guardarLead(lead);
  } catch (err) {
    console.error("Error guardando lead:", err);
    return Response.json({ ok: false, error: "Error guardando el lead." }, { status: 500 });
  }

  // El email es complementario: si falla, el lead igual quedó en KV/HEAT.
  try {
    await enviarLeadPorEmail(lead);
  } catch (err) {
    console.error("Error enviando email del lead:", err);
  }

  return Response.json({ ok: true });
}
