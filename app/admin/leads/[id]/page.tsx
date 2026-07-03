import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { obtenerLead } from "@/lib/leads";
import { listarUsuarios } from "@/lib/usuarios";
import AdminShell from "@/components/AdminShell";
import LeadDetailActions from "@/components/LeadDetailActions";
import LeadPipeline from "@/components/LeadPipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function row(label: string, value?: React.ReactNode) {
  return (
    <div>
      <span className="label">{label}</span>
      <span className="value">{value || "—"}</span>
    </div>
  );
}

function clp(n?: number) {
  if (!n) return "—";
  return "$" + n.toLocaleString("es-CL");
}

function tagCanal(canal?: string) {
  if (canal === "google-ads") return <span className="tag green">📢 Google Ads</span>;
  if (canal === "whatsapp") return <span className="tag green">💬 WhatsApp</span>;
  return <span className="tag gray">🌐 Web orgánico</span>;
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");

  const { id } = await params;
  const lead = await obtenerLead(decodeURIComponent(id));
  if (!lead) notFound();

  // Cargamos usuarios (para el dropdown de "asignado a") — no bloquea si falla.
  const usuarios = await listarUsuarios().catch(() => []);

  const fechaLegible = lead.fecha
    ? new Date(lead.fecha).toLocaleString("es-CL", { timeZone: "America/Santiago" })
    : "—";

  return (
    <AdminShell title="Detalle de lead" userEmail={sesion.email} role={sesion.role}>
      <Link href="/admin/leads" className="admin-back">← Volver a la lista</Link>

      <h1 className="admin-h1" style={{ marginBottom: 4 }}>{lead.nombre || "Sin nombre"}</h1>
      <div style={{ marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tagCanal(lead.canal)}
        {lead.origen && <span className="tag">{lead.origen}</span>}
      </div>

      <LeadPipeline initialLead={lead} usuarios={usuarios} miEmail={sesion.email} />

      <div className="lead-detail-section">
        <h3>Contacto</h3>
        <div className="lead-detail-grid">
          {row("Email", lead.email
            ? <a href={`mailto:${lead.email}`}>{lead.email}</a>
            : null)}
          {row("WhatsApp", lead.telefono
            ? <a href={`https://wa.me/${lead.telefono.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener">{lead.telefono}</a>
            : null)}
          {row("RUT", lead.rut)}
        </div>
      </div>

      <div className="lead-detail-section">
        <h3>Datos para cotizar</h3>
        <div className="lead-detail-grid">
          {row("Edad", lead.edad ? `${lead.edad} años` : null)}
          {row("Sueldo líquido", clp(lead.sueldoLiquido))}
          {row("Región", lead.region)}
          {row("Previsión actual", lead.previsionActual)}
          {row("Cargas", lead.cargasResumen || "Sin cargas")}
          {row("Clínica(s) preferida(s)", lead.clinicaPreferida)}
        </div>
      </div>

      {(lead.isapre || lead.plan) && (
        <div className="lead-detail-section">
          <h3>Plan que le interesó</h3>
          <div className="lead-detail-grid">
            {row("Isapre", lead.isapre)}
            {row("Código del plan", lead.plan)}
          </div>
        </div>
      )}

      <div className="lead-detail-section">
        <h3>Trazabilidad</h3>
        <div className="lead-detail-grid">
          {row("Canal", lead.canal || "web-organico")}
          {row("Origen", lead.origen)}
          {row("gclid (Google Ads)", lead.gclid || "—")}
          {row("Fecha", fechaLegible)}
          {row("ID interno", <code style={{ fontSize: 11 }}>{lead.id}</code>)}
        </div>
      </div>

      <LeadDetailActions leadId={lead.id || ""} role={sesion.role} />
    </AdminShell>
  );
}
