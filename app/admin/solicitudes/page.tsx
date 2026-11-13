import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarPendientes, listarResueltas } from "@/lib/solicitudes";
import { listarUsuarios } from "@/lib/usuarios";
import { veTodo } from "@/lib/roles";
import AdminShell from "@/components/AdminShell";
import SolicitudesPanel from "@/components/SolicitudesPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SolicitudesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  if (!veTodo(sesion.role)) redirect("/admin/leads");
  const [pendientes, resueltas, usuarios] = await Promise.all([listarPendientes(), listarResueltas(), listarUsuarios()]);
  const nombres = Object.fromEntries(usuarios.map((u) => [u.email.toLowerCase(), u.nombre || u.email]));
  return (
    <AdminShell title="Solicitudes" userEmail={sesion.email} role={sesion.role}>
      <SolicitudesPanel
        pendientesIniciales={pendientes}
        resueltasIniciales={resueltas}
        nombres={nombres}
        puedeResolver={sesion.role === "superadmin"}
      />
    </AdminShell>
  );
}
