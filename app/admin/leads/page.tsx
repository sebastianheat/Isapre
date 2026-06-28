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
    </AdminShell>
  );
}
