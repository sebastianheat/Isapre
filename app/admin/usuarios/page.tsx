import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarUsuarios } from "@/lib/usuarios";
import { obtenerSaldo } from "@/lib/credits-kv";
import AdminShell from "@/components/AdminShell";
import { veTodo } from "@/lib/roles";
import { listarPendientes } from "@/lib/solicitudes";
import UsuariosPanel from "@/components/UsuariosPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  if (!veTodo(sesion.role)) redirect("/admin/leads");

  const usuarios = await listarUsuarios();
  const saldos = Object.fromEntries(
    await Promise.all(usuarios.map(async (u) => [u.email, await obtenerSaldo(u.email)] as const)),
  );

  return (
    <AdminShell title="Usuarios" userEmail={sesion.email} role={sesion.role}>
      <UsuariosPanel
        initialUsuarios={usuarios}
        saldosIniciales={saldos}
        miEmail={sesion.email}
        miRol={sesion.role}
        solicitudesPendientes={sesion.role === "admin" ? await listarPendientes() : []}
      />
    </AdminShell>
  );
}
