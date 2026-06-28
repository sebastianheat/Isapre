import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarUsuarios } from "@/lib/usuarios";
import AdminShell from "@/components/AdminShell";
import UsuariosPanel from "@/components/UsuariosPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  if (sesion.role !== "superadmin") redirect("/admin/leads");

  const usuarios = await listarUsuarios();

  return (
    <AdminShell title="Usuarios" userEmail={sesion.email} role={sesion.role}>
      <UsuariosPanel initialUsuarios={usuarios} miEmail={sesion.email} />
    </AdminShell>
  );
}
