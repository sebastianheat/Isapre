import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarImpugnaciones } from "@/lib/impugnaciones";
import { listarUsuarios } from "@/lib/usuarios";
import AdminShell from "@/components/AdminShell";
import ImpugnacionesPanel from "@/components/ImpugnacionesPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ImpugnacionesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  if (sesion.role !== "superadmin") redirect("/admin/leads");
  const [{ pendientes, resueltas }, usuarios] = await Promise.all([listarImpugnaciones(), listarUsuarios()]);
  const nombres = Object.fromEntries(usuarios.map((u) => [u.email.toLowerCase(), u.nombre || u.email]));
  return (
    <AdminShell title="Impugnaciones" userEmail={sesion.email} role={sesion.role}>
      <ImpugnacionesPanel pendientesIniciales={pendientes} resueltasIniciales={resueltas} nombres={nombres} />
    </AdminShell>
  );
}
