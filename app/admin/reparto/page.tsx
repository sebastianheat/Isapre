import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarLeadsSinAsignar } from "@/lib/leads";
import { listarUsuarios } from "@/lib/usuarios";
import { obtenerSaldo } from "@/lib/credits-kv";
import AdminShell from "@/components/AdminShell";
import RepartoCola, { type EjecutivoOpcion, type LeadCola } from "@/components/RepartoCola";
import RepartoAutomaticoToggle from "@/components/RepartoAutomaticoToggle";
import { ejecutivosEnRueda, obtenerPrioridad, repartoAutomaticoActivo } from "@/lib/reparto-auto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RepartoPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/admin");
  if (sesion.role !== "superadmin") redirect("/admin/leads");

  const [leads, usuarios, autoActivo, enRueda, prioridad] = await Promise.all([
    listarLeadsSinAsignar(),
    listarUsuarios(),
    repartoAutomaticoActivo(),
    ejecutivosEnRueda(),
    obtenerPrioridad(),
  ]);

  // Solo quienes tienen prendido "recibir leads" (US-007).
  const ejecutivos: EjecutivoOpcion[] = await Promise.all(
    usuarios.filter((u) => u.recibiendoLeads).map(async (u) => ({
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
      <RepartoAutomaticoToggle
        inicial={autoActivo}
        enRueda={enRueda}
        prioridadInicial={prioridad}
        ejecutivos={usuarios
          .filter((u) => u.role === "ejecutivo")
          .map((u) => ({ email: u.email, nombre: u.nombre || u.email }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))}
      />
      <RepartoCola leadsIniciales={cola} ejecutivosIniciales={ejecutivos} />
      <p style={{ textAlign: "center", marginTop: 18 }}>
        <Link href="/admin/impugnaciones">🚩 Impugnaciones de leads falsos →</Link>
      </p>
    </AdminShell>
  );
}
