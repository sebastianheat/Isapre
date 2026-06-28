import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { getUsuario } from "@/lib/usuarios";
import { listarLeads } from "@/lib/leads";
import AdminShell from "@/components/AdminShell";
import LeadsList from "@/components/LeadsList";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  const u = await getUsuario(sesion.email);
  if (!u) redirect("/admin");

  const leads = await listarLeads(300);

  return (
    <AdminShell title="Leads" userEmail={u.email} role={u.role} passwordEsSemilla={u.passwordEsSemilla}>
      <LeadsList leads={leads} />
    </AdminShell>
  );
}
