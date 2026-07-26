import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarLeads } from "@/lib/leads";
import { filtrarLeadsVisibles } from "@/lib/acceso";
import AdminShell from "@/components/AdminShell";
import PipelineBoard from "@/components/PipelineBoard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");

  const leads = filtrarLeadsVisibles(sesion, await listarLeads(500));

  return (
    <AdminShell title="Pipeline" userEmail={sesion.email} role={sesion.role}>
      <PipelineBoard
        initialLeads={leads}
        miEmail={sesion.email}
        esSuperadmin={sesion.role === "superadmin"}
      />
    </AdminShell>
  );
}
