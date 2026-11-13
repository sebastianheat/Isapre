import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarUsuarios } from "@/lib/usuarios";
import { obtenerSaldo } from "@/lib/credits-kv";
import { resumenPorEjecutivo } from "@/lib/impugnaciones";
import { estadosDeVendedores } from "@/lib/planes-pagados";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { veTodo } from "@/lib/roles";
import CreditosPanel, { type FilaSaldo } from "@/components/CreditosPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CreditosPage({
  searchParams,
}: {
  searchParams: Promise<{ ejecutivo?: string }>;
}) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  if (!veTodo(sesion.role)) redirect("/admin/leads");

  const { ejecutivo } = await searchParams;
  const [usuarios, impugnados, cuentas] = await Promise.all([
    listarUsuarios(),
    resumenPorEjecutivo(),
    estadosDeVendedores(),
  ]);
  const filas: FilaSaldo[] = await Promise.all(
    usuarios.map(async (u) => ({
      email: u.email,
      nombre: u.nombre || u.email,
      saldo: await obtenerSaldo(u.email),
      impugnados: impugnados[u.email.toLowerCase()],
      cuenta: cuentas[u.email.toLowerCase()],
    })),
  );
  filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <AdminShell title="Créditos" userEmail={sesion.email} role={sesion.role}>
      {sesion.role === "admin" && (
        <p style={{ marginTop: 0 }}>
          <Link href={`/admin/creditos/${encodeURIComponent(sesion.email.toLowerCase())}#planes`}>
            🧾 Registrar mis planes pagados →
          </Link>
        </p>
      )}
      <CreditosPanel
        filasIniciales={filas}
        ejecutivoInicial={filas.some((f) => f.email === ejecutivo) ? ejecutivo : undefined}
        soloLectura={sesion.role !== "superadmin"}
      />
    </AdminShell>
  );
}
