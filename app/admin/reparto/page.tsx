import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarLeadsSinAsignar } from "@/lib/leads";
import { listarUsuarios } from "@/lib/usuarios";
import { obtenerSaldo } from "@/lib/credits-kv";
import AdminShell from "@/components/AdminShell";
import RepartoCola, { type EjecutivoOpcion, type LeadCola } from "@/components/RepartoCola";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RepartoPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  if (sesion.role !== "superadmin") redirect("/admin/leads");

  const [leads, usuarios] = await Promise.all([listarLeadsSinAsignar(), listarUsuarios()]);

  const ejecutivos: EjecutivoOpcion[] = await Promise.all(
    usuarios.map(async (u) => ({
      email: u.email,
      nombre: u.nombre || u.email,
      saldo: await obtenerSaldo(u.email),
    })),
  );
  ejecutivos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const cola: LeadCola[] = leads
    .filter((l): l is typeof l & { id: string } => !!l.id)
    .map((l) => ({
      id: l.id,
      nombre: l.nombre || "Sin nombre",
      canal: l.canal ?? "web-organico",
      fecha: l.fecha ?? "",
    }));

  return (
    <AdminShell title="Reparto" userEmail={sesion.email} role={sesion.role}>
      <RepartoCola leadsIniciales={cola} ejecutivosIniciales={ejecutivos} />
    </AdminShell>
  );
}
