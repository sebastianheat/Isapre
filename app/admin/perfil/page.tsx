import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { getUsuario } from "@/lib/usuarios";
import AdminShell from "@/components/AdminShell";
import CambiarPassword from "@/components/CambiarPassword";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");

  // Para perfil sí queremos los datos completos (nombre, etc.). Si KV falla,
  // mostramos los datos de la sesión y un mensaje.
  const u = await getUsuario(sesion.email).catch(() => null);

  return (
    <AdminShell title="Mi perfil" userEmail={sesion.email} role={sesion.role}>
      <h1 className="admin-h1">Mi perfil</h1>
      <div className="admin-card">
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "var(--admin-text-soft)", fontSize: 13 }}>Email</span>
          <div style={{ fontWeight: 600 }}>{sesion.email}</div>
        </div>
        <div style={{ marginBottom: 4, marginTop: 10 }}>
          <span style={{ color: "var(--admin-text-soft)", fontSize: 13 }}>Nombre</span>
          <div style={{ fontWeight: 600 }}>{u?.nombre || "—"}</div>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={{ color: "var(--admin-text-soft)", fontSize: 13 }}>Rol</span>
          <div style={{ fontWeight: 600 }}>{sesion.role === "superadmin" ? "Superadmin" : "Ejecutivo"}</div>
        </div>
      </div>

      <h2 className="admin-h2">Cambiar contraseña</h2>
      <CambiarPassword />
    </AdminShell>
  );
}
