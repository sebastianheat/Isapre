import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { getUsuario, listarUsuarios } from "@/lib/usuarios";
import AdminShell from "@/components/AdminShell";
import UsuariosPanel from "@/components/UsuariosPanel";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  const u = await getUsuario(sesion.email);
  if (!u) redirect("/admin");
  if (u.role !== "superadmin") redirect("/admin/leads");

  const usuarios = await listarUsuarios();

  return (
    <AdminShell title="Usuarios" userEmail={u.email} role={u.role} passwordEsSemilla={u.passwordEsSemilla}>
      <UsuariosPanel initialUsuarios={usuarios} miEmail={u.email} />
    </AdminShell>
  );
}
