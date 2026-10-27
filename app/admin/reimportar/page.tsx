import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";
import ReimportarLeads from "@/components/ReimportarLeads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReimportarPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  if (sesion.role !== "superadmin") redirect("/admin/leads");
  return (
    <AdminShell title="Reimportar leads" userEmail={sesion.email} role={sesion.role}>
      <ReimportarLeads />
    </AdminShell>
  );
}
