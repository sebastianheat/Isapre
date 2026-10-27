import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { conciliarCreditos } from "@/lib/conciliar-creditos";
import AdminShell from "@/components/AdminShell";
import ConciliarCreditos from "@/components/ConciliarCreditos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ConciliarCreditosPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  if (sesion.role !== "superadmin") redirect("/admin/leads");
  const filas = await conciliarCreditos();
  return (
    <AdminShell title="Conciliar créditos" userEmail={sesion.email} role={sesion.role}>
      <Link href="/admin/creditos" className="admin-back">← Volver a créditos</Link>
      <ConciliarCreditos filasIniciales={filas} />
    </AdminShell>
  );
}
