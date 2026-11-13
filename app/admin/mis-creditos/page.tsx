import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { obtenerSaldo } from "@/lib/credits-kv";
import { estadoCuenta, listarPagosDe } from "@/lib/planes-pagados";
import { getUsuario } from "@/lib/usuarios";
import { vende } from "@/lib/roles";
import AdminShell from "@/components/AdminShell";
import PlanesPagados from "@/components/PlanesPagados";
import PestanasCreditos from "@/components/PestanasCreditos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El vendedor ve su cupo, cuántos planes debe y registra los planes pagados.
export default async function MisCreditosPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  const u = await getUsuario(sesion.email);
  if (!u || !vende(u.role)) redirect("/admin/creditos");
  const [saldo, cuenta, pagos] = await Promise.all([
    obtenerSaldo(sesion.email),
    estadoCuenta(sesion.email),
    listarPagosDe(sesion.email),
  ]);
  return (
    <AdminShell title="Mis créditos" userEmail={sesion.email} role={sesion.role}>
      {sesion.role === "admin" && <PestanasCreditos activa="mios" />}
      <h1 className="admin-h1">Mis créditos</h1>
      <PlanesPagados
        email={sesion.email.toLowerCase()}
        saldo={saldo}
        estadoInicial={cuenta}
        pagosIniciales={pagos}
        puedeRegistrar
        puedeValidar={false}
      />
    </AdminShell>
  );
}
