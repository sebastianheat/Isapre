import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarLeads } from "@/lib/leads";
import { listarUsuarios } from "@/lib/usuarios";
import { filtrarLeadsVisibles } from "@/lib/acceso";
import AdminShell from "@/components/AdminShell";
import LeadsList from "@/components/LeadsList";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");

  const leads = filtrarLeadsVisibles(sesion, await listarLeads(300));

  // Mapa email -> nombre para la etiqueta "asignado a" (solo la ve el
  // superadmin: al ejecutivo todos sus leads son suyos, sería ruido).
  let nombres: Record<string, string> = {};
  if (sesion.role === "superadmin") {
    const usuarios = await listarUsuarios().catch(() => []);
    nombres = Object.fromEntries(usuarios.map((u) => [u.email, u.nombre || u.email]));
  }

  return (
    <AdminShell title="Leads" userEmail={sesion.email} role={sesion.role}>
      <LeadsList
        leads={leads}
        mostrarAsignado={sesion.role === "superadmin"}
        nombresUsuarios={nombres}
      />
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
