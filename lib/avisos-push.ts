// Qué notificaciones push manda el panel y con qué texto.

import { listarMovimientos, obtenerSaldo } from "./credits-kv";
import { enviarPush, enviarPushARoles, tieneDispositivos } from "./push";
import { listarUsuarios } from "./usuarios";
import { vende } from "./roles";
import type { Lead, RecordatorioLead } from "./leads";

const urlLead = (id?: string) => `/admin/leads/${encodeURIComponent(id ?? "")}`;

const mesSantiago = (iso: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Santiago", year: "numeric", month: "2-digit" }).format(new Date(iso));

// Al vendedor, cada lead que se le asigna.
export async function pushLeadAsignado(lead: Lead, email: string): Promise<void> {
  const esteMes = mesSantiago(new Date().toISOString());
  const delMes = (await listarMovimientos(email)).filter(
    (m) => m.tipo === "asignacion" && mesSantiago(m.fecha) === esteMes,
  ).length;
  await enviarPush(email, {
    titulo: `📋 Nuevo lead: ${lead.nombre}`,
    cuerpo: [lead.region, delMes > 0 ? `llevas ${delMes} este mes` : null].filter(Boolean).join(" · ") || "Contáctalo lo antes posible.",
    url: urlLead(lead.id),
    tag: `lead-${lead.id}`,
  });
}

// Al vendedor, cuando vence un recordatorio.
export async function pushRecordatorio(lead: Lead, rec: RecordatorioLead, email: string): Promise<void> {
  await enviarPush(email, {
    titulo: `⏰ Recordatorio: ${lead.nombre}`,
    cuerpo: rec.mensaje || "Tienes un recordatorio pendiente con este cliente.",
    url: urlLead(lead.id),
    tag: `rec-${rec.id}`,
  });
}

// Al superadmin (y al admin, cuando le toca la primera aprobación).
export async function pushImpugnacionNueva(lead: Lead, ejecutivoNombre: string, ejecutivoEmail: string): Promise<void> {
  await enviarPushARoles(
    ["superadmin", "admin"],
    {
      titulo: "🚩 Impugnación por revisar",
      cuerpo: `${ejecutivoNombre} dice que ${lead.nombre} es un lead falso.`,
      url: "/admin/impugnaciones",
      tag: "impugnaciones",
    },
    ejecutivoEmail,
  );
}

export async function pushRevisionAdmin(lead: Lead, adminNombre: string, aprueba: boolean): Promise<void> {
  await enviarPushARoles(["superadmin"], {
    titulo: "🚩 Impugnación lista para tu aprobación",
    cuerpo: `${adminNombre} ${aprueba ? "dio visto bueno" : "dice que no es falso"}: ${lead.nombre}.`,
    url: "/admin/impugnaciones",
    tag: "impugnaciones",
  });
}

export async function pushSolicitudNueva(adminNombre: string, texto: string): Promise<void> {
  await enviarPushARoles(["superadmin"], {
    titulo: "📝 Solicitud por aprobar",
    cuerpo: `${adminNombre}: ${texto}`,
    url: "/admin/solicitudes",
    tag: "solicitudes",
  });
}

// Resumen de la mañana para cada vendedor con notificaciones activas:
// cuántos leads recibió ayer, cuántos tiene sin contactar y su cupo.
export function textoResumen(ayer: number, sinContactar: number, cupo: number): string {
  const partes = [
    ayer === 0 ? "Ayer no recibiste leads" : `Ayer recibiste ${ayer} lead${ayer === 1 ? "" : "s"}`,
    sinContactar > 0 ? `${sinContactar} sin contactar` : null,
    `cupo: ${cupo}`,
  ];
  return partes.filter(Boolean).join(" · ");
}

export async function enviarResumenDiario(leads: Lead[], ahora = new Date()): Promise<number> {
  const dia = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Santiago" }).format(d);
  const ayer = dia(new Date(ahora.getTime() - 24 * 60 * 60 * 1000));
  let enviados = 0;
  for (const u of (await listarUsuarios()).filter((x) => vende(x.role) && x.recibiendoLeads)) {
    if (!(await tieneDispositivos(u.email))) continue;
    const suyos = leads.filter((l) => (l.asignadoA ?? "").toLowerCase() === u.email.toLowerCase() && !l.falso);
    const deAyer = suyos.filter((l) => l.fecha && dia(new Date(l.fecha)) === ayer).length;
    const sinContactar = suyos.filter((l) => (l.etapa ?? "nuevo") === "nuevo").length;
    enviados += await enviarPush(u.email, {
      titulo: "☀️ Tu resumen de hoy",
      cuerpo: textoResumen(deAyer, sinContactar, await obtenerSaldo(u.email)),
      url: "/admin/pipeline",
      tag: "resumen-diario",
    });
  }
  return enviados;
}
