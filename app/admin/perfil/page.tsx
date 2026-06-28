import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { getUsuario } from "@/lib/usuarios";
import AdminShell from "@/components/AdminShell";
import CambiarPassword from "@/components/CambiarPassword";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  const u = await getUsuario(sesion.email);
  if (!u) redirect("/admin");

  return (
    <AdminShell title="Mi perfil" userEmail={u.email} role={u.role} passwordEsSemilla={u.passwordEsSemilla}>
      <h1 className="admin-h1">Mi perfil</h1>
      <div className="admin-card">
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "var(--admin-text-soft)", fontSize: 13 }}>Email</span>
          <div style={{ fontWeight: 600 }}>{u.email}</div>
        </div>
        <div style={{ marginBottom: 4, marginTop: 10 }}>
          <span style={{ color: "var(--admin-text-soft)", fontSize: 13 }}>Nombre</span>
          <div style={{ fontWeight: 600 }}>{u.nombre || "—"}</div>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={{ color: "var(--admin-text-soft)", fontSize: 13 }}>Rol</span>
          <div style={{ fontWeight: 600 }}>{u.role === "superadmin" ? "Superadmin" : "Ejecutivo"}</div>
        </div>
      </div>

      <h2 className="admin-h2">Cambiar contraseña</h2>
      <CambiarPassword />
    </AdminShell>
  );
}
