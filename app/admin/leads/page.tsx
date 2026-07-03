import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarLeads } from "@/lib/leads";
import AdminShell from "@/components/AdminShell";
import LeadsList from "@/components/LeadsList";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");

  const leads = await listarLeads(300);

  return (
    <AdminShell title="Leads" userEmail={sesion.email} role={sesion.role}>
      <LeadsList leads={leads} />
      {sesion.role === "superadmin" && (
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <a
            href="/api/admin/leads/export-offline"
            className="admin-btn small secondary"
            style={{ display: "inline-block", textDecoration: "none" }}
          >
            ⬇ Exportar conversiones calificadas (CSV Google Ads)
          </a>
          <p style={{ fontSize: 11, color: "var(--admin-text-soft)", marginTop: 6 }}>
            Incluye leads marcados ✅ Calificado con gclid, no exportados antes.
            Subir en Google Ads → Objetivos → Conversiones → Subidas.
          </p>
        </div>
      )}
    </AdminShell>
  );
}
