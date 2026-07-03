// Envío de leads al inbox del equipo (info@nuevaisapre.cl) vía Resend.
// Requiere RESEND_API_KEY en Vercel. Si no está configurado, hace log y sale
// silencioso para no romper el flujo del formulario.

import { Resend } from "resend";
import type { Lead, RecordatorioLead } from "./leads";

const DESTINO = process.env.LEAD_EMAIL_TO || "info@nuevaisapre.cl";
const REMITENTE = process.env.LEAD_EMAIL_FROM || "Romina <leads@nuevaisapre.cl>";

function esc(s?: string | number | null): string {
  if (s === undefined || s === null || s === "") return "—";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function clp(n?: number): string {
  if (!n) return "—";
  return new Intl.NumberFormat("es-CL").format(n);
}

export async function enviarLeadPorEmail(lead: Lead): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("RESEND_API_KEY no configurado; lead NO enviado por email.");
    return;
  }
  const resend = new Resend(apiKey);

  const html = `
  <div style="font-family: -apple-system, system-ui, sans-serif; color: #0F172A; max-width: 560px;">
    <h2 style="color: #0D47A1; margin: 0 0 12px;">Nuevo lead desde nuevaisapre.cl</h2>
    <p style="color: #475569; margin: 0 0 18px;">
      ${esc(lead.nombre)} pidió cotización el ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })}.
    </p>
    <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
      <tbody>
        ${row("Nombre", esc(lead.nombre))}
        ${row("RUT", esc(lead.rut))}
        ${row("WhatsApp", esc(lead.telefono))}
        ${row("Email", esc(lead.email))}
        ${row("Región", esc(lead.region))}
        ${row("Edad", esc(lead.edad))}
        ${row("Sueldo líquido", `$${clp(lead.sueldoLiquido)} CLP`)}
        ${row("Previsión actual", esc(lead.previsionActual))}
        ${row("Cargas", esc(lead.cargasResumen))}
        ${row("Clínicas preferidas", esc(lead.clinicaPreferida))}
        ${row("Origen", esc(lead.origen))}
      </tbody>
    </table>
    <p style="color: #475569; font-size: 12px; margin-top: 20px;">
      Asignar a un ejecutivo para contacto por WhatsApp.
    </p>
  </div>`;

  const text = [
    `Nuevo lead desde nuevaisapre.cl`,
    ``,
    `Nombre: ${lead.nombre}`,
    `RUT: ${lead.rut}`,
    `WhatsApp: ${lead.telefono}`,
    `Email: ${lead.email}`,
    `Región: ${lead.region ?? "—"}`,
    `Edad: ${lead.edad ?? "—"}`,
    `Sueldo líquido: $${clp(lead.sueldoLiquido)} CLP`,
    `Previsión actual: ${lead.previsionActual ?? "—"}`,
    `Cargas: ${lead.cargasResumen || "—"}`,
    `Clínicas preferidas: ${lead.clinicaPreferida || "—"}`,
    `Origen: ${lead.origen ?? "—"}`,
  ].join("\n");

  const { error } = await resend.emails.send({
    from: REMITENTE,
    to: [DESTINO],
    replyTo: lead.email,
    subject: `Lead: ${lead.nombre}${lead.region ? ` · ${lead.region}` : ""}`,
    html,
    text,
  });
  if (error) throw new Error(`Resend: ${error.message ?? JSON.stringify(error)}`);
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding: 8px 12px 8px 0; color: #475569; border-bottom: 1px solid #E2E8F0; vertical-align: top; width: 38%;">${label}</td>
    <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0;"><strong>${value}</strong></td>
  </tr>`;
}

// Manda un email con un recordatorio pendiente. Destino: asignadoA si existe,
// sino info@nuevaisapre.cl. Se dispara desde el cron /api/cron/recordatorios.
export async function enviarRecordatorioPorEmail(
  lead: Lead,
  recordatorio: RecordatorioLead,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = new Resend(apiKey);
  const destino = lead.asignadoA || DESTINO;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://nuevaisapre.cl";
  const linkLead = `${site}/admin/leads/${encodeURIComponent(lead.id ?? "")}`;
  const fechaProg = new Date(recordatorio.fecha).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const wa = lead.telefono
    ? `https://wa.me/${lead.telefono.replace(/[^0-9]/g, "")}`
    : null;

  const html = `
  <div style="font-family: -apple-system, system-ui, sans-serif; color: #0F172A; max-width: 560px;">
    <h2 style="color: #B45309; margin: 0 0 12px;">🔔 Recordatorio · ${esc(lead.nombre)}</h2>
    <p style="color: #475569; margin: 0 0 18px;">
      Programado para <strong>${esc(fechaProg)}</strong>.
    </p>
    <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; font-size: 15px;">
      ${esc(recordatorio.mensaje)}
    </div>
    <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
      <tbody>
        ${row("Cliente", esc(lead.nombre))}
        ${row("WhatsApp", wa ? `<a href="${wa}" style="color:#0D47A1;">${esc(lead.telefono)}</a>` : esc(lead.telefono))}
        ${row("Email", esc(lead.email))}
        ${row("Región", esc(lead.region))}
        ${row("Isapre de interés", esc(lead.isapre))}
        ${row("Etapa actual", esc(lead.etapa))}
      </tbody>
    </table>
    <p style="margin-top: 20px;">
      <a href="${linkLead}" style="display:inline-block; padding:10px 18px; background:#0D47A1; color:#fff; text-decoration:none; border-radius:8px; font-weight:600;">
        Abrir lead en el panel
      </a>
    </p>
    <p style="color: #475569; font-size: 12px; margin-top: 20px;">
      Creado por ${esc(recordatorio.creadoPor)}.
    </p>
  </div>`;

  const text = [
    `Recordatorio: ${lead.nombre}`,
    `Programado para: ${fechaProg}`,
    ``,
    recordatorio.mensaje,
    ``,
    `Cliente: ${lead.nombre}`,
    `WhatsApp: ${lead.telefono ?? "—"}`,
    `Email: ${lead.email ?? "—"}`,
    `Etapa: ${lead.etapa ?? "—"}`,
    ``,
    `Abrir lead: ${linkLead}`,
  ].join("\n");

  const { error } = await resend.emails.send({
    from: REMITENTE,
    to: [destino],
    cc: destino === DESTINO ? undefined : [DESTINO],
    replyTo: DESTINO,
    subject: `🔔 Recordatorio: ${lead.nombre} — ${recordatorio.mensaje.slice(0, 50)}`,
    html,
    text,
  });
  if (error) throw new Error(`Resend recordatorio: ${error.message ?? JSON.stringify(error)}`);
}

// Manda el CSV semanal de conversiones offline como adjunto a info@. Lo
// dispara el cron /api/cron/export-semanal cada lunes. Titi solo tiene que
// descargar el adjunto y subirlo en Google Ads → Conversiones → Subidas.
export async function enviarCsvOfflinePorEmail(
  csv: string,
  cantidad: number,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = new Resend(apiKey);
  const fecha = new Date().toLocaleDateString("es-CL", { timeZone: "America/Santiago" });

  const html = `
  <div style="font-family: -apple-system, system-ui, sans-serif; color: #0F172A; max-width: 560px;">
    <h2 style="color: #0D47A1; margin: 0 0 12px;">📊 CSV semanal de conversiones — Google Ads</h2>
    <p style="color: #475569;">
      Adjunto va el CSV con <strong>${cantidad} lead${cantidad === 1 ? "" : "s"} calificado${cantidad === 1 ? "" : "s"}</strong>
      de la semana, listo para subir a Google Ads.
    </p>
    <ol style="color: #0F172A; font-size: 14px; line-height: 1.7;">
      <li>Descargar el archivo adjunto</li>
      <li>Google Ads → <strong>Objetivos → Conversiones → Subidas</strong></li>
      <li><strong>+ Subir archivo</strong> → elegir el CSV → <strong>Aplicar</strong></li>
    </ol>
    <p style="color: #475569; font-size: 12px; margin-top: 18px;">
      Esto le enseña a Google qué clicks terminan en leads vendibles, para que
      optimice la campaña hacia esos perfiles. Si no hay leads nuevos que subir,
      este correo no llega.
    </p>
  </div>`;

  const { error } = await resend.emails.send({
    from: REMITENTE,
    to: [DESTINO],
    subject: `📊 CSV Google Ads: ${cantidad} conversión${cantidad === 1 ? "" : "es"} calificada${cantidad === 1 ? "" : "s"} (${fecha})`,
    html,
    text: `Adjunto CSV con ${cantidad} leads calificados. Subir en Google Ads → Objetivos → Conversiones → Subidas.`,
    attachments: [
      {
        filename: `offline-conversions-${new Date().toISOString().slice(0, 10)}.csv`,
        content: Buffer.from(csv, "utf-8"),
      },
    ],
  });
  if (error) throw new Error(`Resend CSV: ${error.message ?? JSON.stringify(error)}`);
}
