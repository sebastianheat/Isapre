// Tipos y constantes del pipeline CRM. Módulo SIN dependencias de servidor
// (no importa store/email/resend) para que los componentes client puedan
// importarlo sin arrastrar código de backend al bundle del navegador.

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
  { id: "nuevo",       label: "Nuevo",               icon: "🆕", color: "#3B82F6" },
  { id: "contactando", label: "Contactando",         icon: "📞", color: "#F59E0B" },
  { id: "cotizado",    label: "Cotización enviada",  icon: "📄", color: "#8B5CF6" },
  { id: "pendiente",   label: "Pendiente respuesta", icon: "⏳", color: "#EAB308" },
  { id: "agendado",    label: "Agendado",            icon: "📅", color: "#06B6D4" },
  { id: "ganado",      label: "Ganado ✓",            icon: "🏆", color: "#10B981" },
  { id: "perdido",     label: "Perdido",             icon: "✕",  color: "#EF4444" },
];

// Calificación manual del lead. Alimenta el export de conversiones offline a
// Google Ads: solo los "calificado" se reportan como conversión de valor,
// para que Google optimice hacia perfiles que realmente sirven (y no hacia
// cualquier formulario enviado).
export type CalidadLead = "calificado" | "marginal" | "no_calificado";

export const CALIDADES: { id: CalidadLead; label: string; icon: string; color: string }[] = [
  { id: "calificado",    label: "Calificado",    icon: "✅", color: "#10B981" },
  { id: "marginal",      label: "Marginal",      icon: "🟡", color: "#F59E0B" },
  { id: "no_calificado", label: "No calificado", icon: "🚫", color: "#EF4444" },
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
