import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarUsuarios } from "@/lib/usuarios";
import { obtenerSaldo } from "@/lib/credits-kv";
import { resumenPorEjecutivo } from "@/lib/impugnaciones";
import AdminShell from "@/components/AdminShell";
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
  if (sesion.role !== "superadmin") redirect("/admin/leads");

  const { ejecutivo } = await searchParams;
  const [usuarios, impugnados] = await Promise.all([listarUsuarios(), resumenPorEjecutivo()]);
  const filas: FilaSaldo[] = await Promise.all(
    usuarios.map(async (u) => ({
      email: u.email,
      nombre: u.nombre || u.email,
      saldo: await obtenerSaldo(u.email),
      impugnados: impugnados[u.email.toLowerCase()],
    })),
  );
  filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <AdminShell title="Créditos" userEmail={sesion.email} role={sesion.role}>
      <CreditosPanel
        filasIniciales={filas}
        ejecutivoInicial={filas.some((f) => f.email === ejecutivo) ? ejecutivo : undefined}
      />
    </AdminShell>
  );
}
