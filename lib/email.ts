// Envío de leads al inbox del equipo (info@nuevaisapre.cl) vía Resend.
// Requiere RESEND_API_KEY en Vercel. Si no está configurado, hace log y sale
// silencioso para no romper el flujo del formulario.

import { Resend } from "resend";
import type { Lead } from "./leads";

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
    <h2 style="color: #0D47A1; margin: 0 0 12px;">Nuevo lead desde beta.nuevaisapre.cl</h2>
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
    `Nuevo lead desde beta.nuevaisapre.cl`,
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
